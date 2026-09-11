package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.*;
import uz.shinamagazin.api.dto.response.*;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.PurchaseCurrency;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Xaridlar — kirim hujjati (ta'minotchi yuk xati) asosida.
 *
 * <p>Hujjat ikki yo'l bilan rasmiylashtiriladi:
 * <ul>
 *   <li>{@code receiveNow = true} — kiritish = qabul qilish: mol darhol
 *       omborga kiradi, ta'minotchi balansiga qarz yoziladi (eski oqim);
 *   <li>{@code receiveNow = false} — hujjat {@code ORDERED} holatida
 *       kutadi (mol yo'lda yoki hali sanalmagan). Omborchi molni sanab
 *       {@link #receivePurchase} bilan qabul qiladi — "TEKSHIRILDI" muhri.
 *       Kam kelgan mol qatorda {@code ordered − received} sifatida
 *       ko'rinadi, ta'minotchi qarzi esa faqat kelgan mol uchun yoziladi.
 * </ul>
 *
 * <p>Pul arifmetikasi {@link PurchasePricing} da — bu yerda faqat holat
 * mashinasi va yozuvlar.
 */
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final PurchasePaymentRepository purchasePaymentRepository;
    private final PurchaseReturnRepository purchaseReturnRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final SupplierService supplierService;
    private final DocumentNumberService documentNumberService;

    // ==================== PURCHASE ORDERS ====================

    public Page<PurchaseOrderResponse> getAllPurchases(
            Long supplierId, PurchaseOrderStatus status,
            LocalDate startDate, LocalDate endDate, Pageable pageable) {
        // Native query uchun enum ni String ga o'giramiz
        String statusStr = status != null ? status.name() : null;
        return purchaseOrderRepository.findAllWithFilters(supplierId, statusStr, startDate, endDate, pageable)
                .map(this::mapToResponse);
    }

    public PurchaseOrderResponse getPurchaseById(Long id) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));
        return mapToResponseWithItems(purchase);
    }

    public List<PurchaseOrderResponse> getPurchasesBySupplier(Long supplierId) {
        return purchaseOrderRepository.findBySupplierIdOrderByOrderDateDesc(supplierId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchaseOrderResponse createPurchase(PurchaseRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", request.getSupplierId()));

        User currentUser = getCurrentUser();

        PurchaseCurrency currency = request.getCurrency() != null ? request.getCurrency() : PurchaseCurrency.UZS;
        BigDecimal rate = resolveExchangeRate(currency, request.getExchangeRate());
        boolean receiveNow = !Boolean.FALSE.equals(request.getReceiveNow());
        BigDecimal transportCost = nz(request.getTransportCost());

        List<Product> products = new ArrayList<>();
        List<PurchasePricing.LineInput> inputs = new ArrayList<>();
        for (PurchaseItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", itemRequest.getProductId()));
            products.add(product);
            inputs.add(new PurchasePricing.LineInput(product.getId(), itemRequest.getQuantity(),
                    itemRequest.getUnitPrice(), itemRequest.getBonusPerUnit(), itemRequest.getBonusPercent()));
        }

        PurchasePricing.Totals totals = PurchasePricing.compute(currency, rate, transportCost, inputs);
        BigDecimal totalAmount = totals.totalAmount();
        BigDecimal paidAmount = nz(request.getPaidAmount());

        // Xarid summasidan ORTIQCHA to'lab bo'lmaydi. addPayment'da bu chegara
        // bor edi, yaratishda esa yo'q: ortiqcha summa tekshirilmasdan PAID
        // deb saqlanib, javobdagi debtAmount manfiyga tushardi.
        if (paidAmount.compareTo(totalAmount) > 0) {
            throw new BadRequestException(String.format(
                    "To'langan summa xarid summasidan (%s) katta bo'lishi mumkin emas", totalAmount));
        }

        PurchaseOrder purchase = PurchaseOrder.builder()
                .orderNumber(generateOrderNumber())
                .supplier(supplier)
                .orderDate(request.getOrderDate())
                .status(receiveNow ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.ORDERED)
                .paymentStatus(calculatePaymentStatus(paidAmount, totalAmount))
                .notes(trimToNull(request.getNotes()))
                .createdBy(currentUser)
                .currency(currency)
                .exchangeRate(rate)
                .supplierDocNumber(trimToNull(request.getSupplierDocNumber()))
                .supplierDocDate(request.getSupplierDocDate())
                .vehicleNumber(trimToNull(request.getVehicleNumber()))
                .transportCost(transportCost)
                .goodsAmount(totals.goodsAmount())
                .bonusAmount(totals.bonusAmount())
                .totalAmount(totalAmount)
                .foreignTotalAmount(totals.foreignTotalAmount())
                .paidAmount(paidAmount)
                .build();

        for (int i = 0; i < totals.lines().size(); i++) {
            PurchasePricing.Line line = totals.lines().get(i);
            purchase.addItem(PurchaseOrderItem.builder()
                    .product(products.get(i))
                    .orderedQuantity(line.quantity())
                    .receivedQuantity(receiveNow ? line.quantity() : 0)
                    .unitPrice(line.unitPrice())
                    .totalPrice(line.totalPrice())
                    .foreignUnitPrice(line.foreignUnitPrice())
                    .bonusPerUnit(line.bonusPerUnit())
                    .bonusPercent(line.bonusPercent())
                    .bonusAmount(line.bonusAmount())
                    .landedUnitCost(line.landedUnitCost())
                    .build());
        }

        if (receiveNow) {
            stampReceived(purchase, currentUser);
        }

        // Avval saqlanadi: ombor harakati hujjat ID'siga bog'lanishi kerak
        PurchaseOrder savedPurchase = purchaseOrderRepository.save(purchase);

        if (receiveNow) {
            for (PurchaseOrderItem item : savedPurchase.getItems()) {
                applyStockIn(savedPurchase, item, item.getOrderedQuantity(), currentUser);
            }
            // Ta'minotchi balansi: qarz faqat KELGAN mol uchun
            BigDecimal debtAmount = totalAmount.subtract(paidAmount);
            if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
                supplierService.updateBalance(supplier.getId(), debtAmount);
            }
        } else if (paidAmount.signum() > 0) {
            // Oldindan to'lov: mol hali kelmagan — ta'minotchi bizga qarzdor
            // (balans manfiy). Qabul qilinganda mol summasi qo'shiladi.
            supplierService.updateBalance(supplier.getId(), paidAmount.negate());
        }

        return mapToResponseWithItems(savedPurchase);
    }

    /**
     * Molni sanab qabul qilish — "TEKSHIRILDI" muhri.
     *
     * <p>Har qator uchun JAMI qabul qilingan miqdor yuboriladi (ro'yxat
     * bo'sh bo'lsa — hujjatdagi miqdor). Summalar QABUL QILINGAN miqdor
     * bo'yicha qayta hisoblanadi: ta'minotchiga kelmagan mol uchun qarz
     * yozilmaydi, kamomad esa qatorda ko'rinib turadi. Hammasi kelgan
     * bo'lsa RECEIVED, qismi kelsa PARTIAL — qolgani keyingi yetkazmada
     * shu endpoint orqali qabul qilinadi.
     */
    @Transactional
    public PurchaseOrderResponse receivePurchase(Long id, PurchaseReceiveRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw new BadRequestException("Bu xarid allaqachon to'liq qabul qilingan");
        }
        if (purchase.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan xaridni qabul qilib bo'lmaydi");
        }

        User currentUser = getCurrentUser();

        Map<Long, Integer> requested = new HashMap<>();
        if (request != null && request.getItems() != null) {
            for (PurchaseReceiveRequest.Line line : request.getItems()) {
                boolean known = purchase.getItems().stream()
                        .anyMatch(i -> i.getId().equals(line.getItemId()));
                if (!known) {
                    throw new BadRequestException("Bu xarid qatori topilmadi: " + line.getItemId());
                }
                requested.put(line.getItemId(), line.getReceivedQuantity());
            }
        }

        boolean foreign = purchase.getCurrency() != PurchaseCurrency.UZS;
        BigDecimal rate = purchase.getExchangeRate();
        List<PurchaseOrderItem> items = purchase.getItems();
        List<PurchasePricing.LineInput> inputs = new ArrayList<>(items.size());
        List<Integer> previouslyReceived = new ArrayList<>(items.size());
        int totalTarget = 0;

        for (PurchaseOrderItem item : items) {
            int current = item.getReceivedQuantity() != null ? item.getReceivedQuantity() : 0;
            // Ro'yxat berilgan bo'lsa unda yo'q qatorlar O'ZGARMAYDI; ro'yxat
            // umuman berilmasa hamma qator to'liq qabul qilinadi.
            int target = requested.isEmpty()
                    ? item.getOrderedQuantity()
                    : requested.getOrDefault(item.getId(), current);

            if (target < current) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qabul qilingan miqdorni kamaytirib bo'lmaydi (avval qabul qilingan: %d)",
                        item.getProduct().getName(), current));
            }
            if (target > item.getOrderedQuantity()) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qabul qilingan miqdor (%d) hujjatdagi miqdordan (%d) ko'p — "
                                + "ortiqcha mol uchun alohida hujjat kiriting",
                        item.getProduct().getName(), target, item.getOrderedQuantity()));
            }

            BigDecimal unitPriceDoc = foreign && item.getForeignUnitPrice() != null
                    ? item.getForeignUnitPrice() : item.getUnitPrice();
            BigDecimal bonusUnitDoc = foreign
                    ? nz(item.getBonusPerUnit()).divide(rate, 4, RoundingMode.HALF_UP)
                    : nz(item.getBonusPerUnit());

            inputs.add(new PurchasePricing.LineInput(item.getId(), target, unitPriceDoc,
                    bonusUnitDoc, item.getBonusPercent()));
            previouslyReceived.add(current);
            totalTarget += target;
        }

        if (totalTarget == 0) {
            throw new BadRequestException("Hech bo'lmaganda bitta qatorda qabul qilingan miqdor kiritilishi kerak");
        }

        PurchasePricing.Totals totals = PurchasePricing.compute(
                purchase.getCurrency(), rate, purchase.getTransportCost(), inputs);

        // Qisman qabul qilingan hujjatning summasi ta'minotchi balansiga
        // ALLAQACHON yozilgan; faqat farq qo'shiladi.
        BigDecimal bookedBefore = purchase.getStatus() == PurchaseOrderStatus.PARTIAL
                ? purchase.getTotalAmount() : BigDecimal.ZERO;

        boolean complete = true;
        int shortage = 0;
        for (int i = 0; i < items.size(); i++) {
            PurchaseOrderItem item = items.get(i);
            PurchasePricing.Line line = totals.lines().get(i);

            item.setReceivedQuantity(line.quantity());
            item.setTotalPrice(line.totalPrice());
            item.setBonusAmount(line.bonusAmount());
            if (line.landedUnitCost() != null) {
                item.setLandedUnitCost(line.landedUnitCost());
            }

            int delta = line.quantity() - previouslyReceived.get(i);
            if (delta > 0) {
                applyStockIn(purchase, item, delta, currentUser);
            }
            if (line.quantity() < item.getOrderedQuantity()) {
                complete = false;
                shortage += item.getOrderedQuantity() - line.quantity();
            }
        }

        purchase.setGoodsAmount(totals.goodsAmount());
        purchase.setBonusAmount(totals.bonusAmount());
        purchase.setTotalAmount(totals.totalAmount());
        purchase.setForeignTotalAmount(totals.foreignTotalAmount());
        purchase.setStatus(complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIAL);
        purchase.updatePaymentStatus();
        stampReceived(purchase, currentUser);

        StringBuilder note = new StringBuilder();
        if (shortage > 0) {
            note.append("Kamomad: ").append(shortage).append(" dona");
        }
        if (request != null && trimToNull(request.getNotes()) != null) {
            if (note.length() > 0) {
                note.append(" — ");
            }
            note.append(request.getNotes().trim());
        }
        if (note.length() > 0) {
            appendNote(purchase, note.toString());
        }

        PurchaseOrder saved = purchaseOrderRepository.save(purchase);

        BigDecimal balanceDelta = totals.totalAmount().subtract(bookedBefore);
        if (balanceDelta.signum() != 0) {
            supplierService.updateBalance(purchase.getSupplier().getId(), balanceDelta);
        }

        return mapToResponseWithItems(saved);
    }

    /**
     * Hali qabul qilinmagan hujjatni bekor qilish.
     *
     * <p>Qabul qilingan mol uchun bu yo'l yopiq — u zaxira va ta'minotchi
     * balansini o'zgartirgan, ya'ni qaytarish rasmiylashtirilishi kerak.
     * Oldindan to'lov qilingan hujjat ham bekor qilinmaydi: kassadan
     * chiqqan pul iz qoldirishi shart, ta'minotchi bilan hisob-kitob avval.
     */
    @Transactional
    public PurchaseOrderResponse cancelPurchase(Long id, String reason) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() != PurchaseOrderStatus.ORDERED
                && purchase.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException(
                    "Faqat hali qabul qilinmagan xaridni bekor qilish mumkin — "
                            + "qabul qilingan mol uchun qaytarish rasmiylashtiring");
        }
        if (purchase.getPaidAmount() != null && purchase.getPaidAmount().signum() > 0) {
            throw new BadRequestException(
                    "Bu xarid bo'yicha oldindan to'lov qilingan — avval ta'minotchi bilan hisob-kitob qiling");
        }

        purchase.setStatus(PurchaseOrderStatus.CANCELLED);
        appendNote(purchase, "Bekor qilindi" + (trimToNull(reason) != null ? ": " + reason.trim() : ""));

        return mapToResponseWithItems(purchaseOrderRepository.save(purchase));
    }

    @Transactional
    public PurchaseOrderResponse updatePurchase(Long id, PurchaseRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException("Faqat qoralama holatidagi xaridlarni tahrirlash mumkin");
        }

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", request.getSupplierId()));

        PurchaseCurrency currency = request.getCurrency() != null ? request.getCurrency() : PurchaseCurrency.UZS;
        BigDecimal rate = resolveExchangeRate(currency, request.getExchangeRate());
        BigDecimal transportCost = nz(request.getTransportCost());

        purchase.setSupplier(supplier);
        purchase.setOrderDate(request.getOrderDate());
        purchase.setPaidAmount(nz(request.getPaidAmount()));
        purchase.setNotes(trimToNull(request.getNotes()));
        purchase.setCurrency(currency);
        purchase.setExchangeRate(rate);
        purchase.setSupplierDocNumber(trimToNull(request.getSupplierDocNumber()));
        purchase.setSupplierDocDate(request.getSupplierDocDate());
        purchase.setVehicleNumber(trimToNull(request.getVehicleNumber()));
        purchase.setTransportCost(transportCost);

        purchase.getItems().clear();

        List<Product> products = new ArrayList<>();
        List<PurchasePricing.LineInput> inputs = new ArrayList<>();
        for (PurchaseItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", itemRequest.getProductId()));
            products.add(product);
            inputs.add(new PurchasePricing.LineInput(product.getId(), itemRequest.getQuantity(),
                    itemRequest.getUnitPrice(), itemRequest.getBonusPerUnit(), itemRequest.getBonusPercent()));
        }
        PurchasePricing.Totals totals = PurchasePricing.compute(currency, rate, transportCost, inputs);

        for (int i = 0; i < totals.lines().size(); i++) {
            PurchasePricing.Line line = totals.lines().get(i);
            purchase.addItem(PurchaseOrderItem.builder()
                    .product(products.get(i))
                    .orderedQuantity(line.quantity())
                    .receivedQuantity(0)
                    .unitPrice(line.unitPrice())
                    .totalPrice(line.totalPrice())
                    .foreignUnitPrice(line.foreignUnitPrice())
                    .bonusPerUnit(line.bonusPerUnit())
                    .bonusPercent(line.bonusPercent())
                    .bonusAmount(line.bonusAmount())
                    .landedUnitCost(line.landedUnitCost())
                    .build());
        }

        // Yaratishdagi bilan bir xil chegara: qoralama tahrirlanganda ham
        // to'langan summa yangi jami summadan oshib ketmasligi kerak
        if (purchase.getPaidAmount().compareTo(totals.totalAmount()) > 0) {
            throw new BadRequestException(String.format(
                    "To'langan summa xarid summasidan (%s) katta bo'lishi mumkin emas", totals.totalAmount()));
        }

        purchase.setGoodsAmount(totals.goodsAmount());
        purchase.setBonusAmount(totals.bonusAmount());
        purchase.setTotalAmount(totals.totalAmount());
        purchase.setForeignTotalAmount(totals.foreignTotalAmount());
        purchase.updatePaymentStatus();
        PurchaseOrder savedPurchase = purchaseOrderRepository.save(purchase);

        return mapToResponseWithItems(savedPurchase);
    }

    @Transactional
    public void deletePurchase(Long id) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException("Faqat qoralama holatidagi xaridlarni o'chirish mumkin");
        }

        purchaseOrderRepository.delete(purchase);
    }

    public PurchaseStatsResponse getStats() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();

        Long totalPurchases = purchaseOrderRepository.countAllActive();
        Long todayPurchases = purchaseOrderRepository.countByOrderDate(today);
        Long monthPurchases = purchaseOrderRepository.countByOrderDateBetween(monthStart, monthEnd);
        BigDecimal totalAmount = purchaseOrderRepository.sumTotalAmount();
        BigDecimal totalDebt = purchaseOrderRepository.sumTotalDebt();
        Long pendingReturns = purchaseReturnRepository.countByStatus(PurchaseReturnStatus.PENDING);
        Long awaitingReceipt = purchaseOrderRepository.countAwaitingReceipt();
        BigDecimal lastUsdRate = purchaseOrderRepository
                .findLatestExchangeRates(PurchaseCurrency.USD, PageRequest.of(0, 1))
                .stream().findFirst().orElse(null);

        return PurchaseStatsResponse.builder()
                .totalPurchases(totalPurchases != null ? totalPurchases : 0L)
                .todayPurchases(todayPurchases != null ? todayPurchases : 0L)
                .monthPurchases(monthPurchases != null ? monthPurchases : 0L)
                .totalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalDebt(totalDebt != null ? totalDebt : BigDecimal.ZERO)
                .pendingReturns(pendingReturns != null ? pendingReturns : 0L)
                .awaitingReceipt(awaitingReceipt != null ? awaitingReceipt : 0L)
                .lastUsdRate(lastUsdRate)
                .build();
    }

    // ==================== PAYMENTS ====================

    public List<PurchasePaymentResponse> getPayments(Long purchaseId) {
        purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        return purchasePaymentRepository.findByPurchaseOrderIdOrderByPaymentDateDesc(purchaseId)
                .stream()
                .map(this::mapToPaymentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchasePaymentResponse addPayment(Long purchaseId, PaymentRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        if (purchase.getStatus() == PurchaseOrderStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan xarid uchun to'lov qilib bo'lmaydi");
        }

        User currentUser = getCurrentUser();

        // Validate payment amount
        BigDecimal remainingDebt = purchase.getTotalAmount().subtract(purchase.getPaidAmount());
        if (request.getAmount().compareTo(remainingDebt) > 0) {
            throw new BadRequestException("To'lov summasi qolgan qarzdan (" + remainingDebt + ") katta bo'lishi mumkin emas");
        }

        // Create payment
        PurchasePayment payment = PurchasePayment.builder()
                .purchaseOrder(purchase)
                .amount(request.getAmount())
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .referenceNumber(request.getReferenceNumber())
                .notes(request.getNotes())
                .receivedBy(currentUser)
                .build();

        purchasePaymentRepository.save(payment);

        // Update purchase paid amount
        BigDecimal newPaidAmount = purchase.getPaidAmount().add(request.getAmount());
        purchase.setPaidAmount(newPaidAmount);
        purchase.updatePaymentStatus();
        purchaseOrderRepository.save(purchase);

        // Update supplier balance (reduce debt). Kutilayotgan hujjatda bu
        // oldindan to'lov — balans manfiyga tushadi, qabul qilinganda mol
        // summasi qo'shilib, farq qoladi.
        supplierService.updateBalance(purchase.getSupplier().getId(), request.getAmount().negate());

        return mapToPaymentResponse(payment);
    }

    // ==================== RETURNS ====================

    public List<PurchaseReturnResponse> getReturns(Long purchaseId) {
        purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        return purchaseReturnRepository.findByPurchaseOrderIdOrderByReturnDateDesc(purchaseId)
                .stream()
                .map(this::mapToReturnResponse)
                .collect(Collectors.toList());
    }

    public Page<PurchaseReturnResponse> getAllReturns(PurchaseReturnStatus status, Pageable pageable) {
        if (status != null) {
            return purchaseReturnRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(this::mapToReturnResponse);
        }
        return purchaseReturnRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToReturnResponse);
    }

    public PurchaseReturnResponse getReturnById(Long returnId) {
        PurchaseReturn returnOrder = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));
        return mapToReturnResponse(returnOrder);
    }

    @Transactional
    public PurchaseReturnResponse createReturn(Long purchaseId, ReturnRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        // Qisman qabul qilingan hujjatdan ham qaytarish mumkin — kvota
        // baribir receivedQuantity bilan cheklanadi.
        if (purchase.getStatus() != PurchaseOrderStatus.RECEIVED
                && purchase.getStatus() != PurchaseOrderStatus.PARTIAL) {
            throw new BadRequestException("Faqat qabul qilingan xaridlardan qaytarish mumkin");
        }

        User currentUser = getCurrentUser();
        String returnNumber = generateReturnNumber();

        // Boshqa (hali yakunlanmagan) qaytarishlarda band qilingan miqdorlar.
        // Faqat receivedQuantity bilan solishtirish yetarli emas edi: u faqat
        // COMPLETE paytida kamayadi, ya'ni to'liq miqdorga bir nechta parallel
        // PENDING qaytarish yaratib, hammasini yakunlash mumkin edi —
        // receivedQuantity manfiyga tushar, ta'minotchi balansi esa har
        // biriga alohida kreditlanar edi.
        Map<Long, Long> outstanding = purchaseReturnRepository.outstandingReturnQuantities(purchaseId);

        // Bitta so'rov ICHIDA bir mahsulot bir necha marta kelishi mumkin.
        // Kvota har qatorni mustaqil tekshirgani uchun ular bir xil qoldiqni
        // ko'rib, ikkalasi ham o'tib ketardi: receivedQuantity manfiyga
        // tushar, ta'minotchi qo'sh kreditlanar, totalAmount manfiy bo'lib
        // ham PAID deb belgilanardi. Shuning uchun qatorlar avval mahsulot
        // bo'yicha YIG'ILADI — tekshiruv ham, yozuv ham yig'indi ustida.
        Map<Long, Integer> requestedByProduct = new java.util.LinkedHashMap<>();
        for (ReturnItemRequest itemRequest : request.getItems()) {
            requestedByProduct.merge(itemRequest.getProductId(), itemRequest.getQuantity(), Integer::sum);
        }

        // Calculate refund amount and validate quantities
        BigDecimal refundAmount = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> requested : requestedByProduct.entrySet()) {
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(requested.getKey()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Mahsulot xaridda mavjud emas: " + requested.getKey()));

            long alreadyClaimed = outstanding.getOrDefault(purchaseItem.getProduct().getId(), 0L);
            long available = purchaseItem.getReceivedQuantity() - alreadyClaimed;
            if (requested.getValue() > available) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qaytarish mumkin bo'lgan miqdor: %d "
                                + "(qabul qilingan: %d, boshqa qaytarishlarda band: %d)",
                        purchaseItem.getProduct().getName(), Math.max(0, available),
                        purchaseItem.getReceivedQuantity(), alreadyClaimed));
            }

            BigDecimal itemRefund = purchaseItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(requested.getValue()));
            refundAmount = refundAmount.add(itemRefund);
        }

        // Create return
        PurchaseReturn purchaseReturn = PurchaseReturn.builder()
                .returnNumber(returnNumber)
                .purchaseOrder(purchase)
                .returnDate(request.getReturnDate())
                .reason(request.getReason())
                .status(PurchaseReturnStatus.PENDING)
                .refundAmount(refundAmount)
                .createdBy(currentUser)
                .build();

        // Create return items (yig'ilgan miqdorlar bo'yicha — mahsulotga bitta qator)
        for (Map.Entry<Long, Integer> requested : requestedByProduct.entrySet()) {
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(requested.getKey()))
                    .findFirst()
                    .get();

            PurchaseReturnItem returnItem = PurchaseReturnItem.builder()
                    .purchaseReturn(purchaseReturn)
                    .product(purchaseItem.getProduct())
                    .returnedQuantity(requested.getValue())
                    .unitPrice(purchaseItem.getUnitPrice())
                    .totalPrice(purchaseItem.getUnitPrice().multiply(BigDecimal.valueOf(requested.getValue())))
                    .build();

            purchaseReturn.addItem(returnItem);
        }

        purchaseReturnRepository.save(purchaseReturn);
        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public PurchaseReturnResponse approveReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.PENDING) {
            throw new BadRequestException("Faqat kutilayotgan qaytarishlarni tasdiqlash mumkin");
        }

        User currentUser = getCurrentUser();
        purchaseReturn.setStatus(PurchaseReturnStatus.APPROVED);
        purchaseReturn.setApprovedBy(currentUser);
        purchaseReturn.setApprovedAt(LocalDate.now());

        purchaseReturnRepository.save(purchaseReturn);
        return mapToReturnResponse(purchaseReturn);
    }

    /**
     * Qaytarishni rad etadi — yagona "ORQAGA" yo'l.
     *
     * <p>Ilgari APPROVED holatidan chiqish faqat {@code completeReturn} orqali
     * edi, u esa joriy zaxira yetmasa xato beradi (mol allaqachon sotilgan
     * bo'lishi mumkin). Natijada xato yaratilgan yoki endi keraksiz qaytarish
     * APPROVED bo'lib qolib, o'sha mahsulotning kvotasini band qilib turardi
     * ({@code outstandingReturnQuantities} PENDING va APPROVED ni sanaydi) —
     * yangi qaytarish "boshqa qaytarishlarda band" deb rad etilardi.
     * REJECTED kvotaga kirmaydi, ya'ni rad etish uni bo'shatadi.
     *
     * <p>Zaxira va ta'minotchi balansiga TEGILMAYDI: rad etilgan qaytarish
     * hech qachon yakunlanmagan, ya'ni hech narsa o'zgartirmagan.
     */
    @Transactional
    public PurchaseReturnResponse rejectReturn(Long returnId, String reason) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() == PurchaseReturnStatus.COMPLETED) {
            throw new BadRequestException(
                    "Yakunlangan qaytarishni rad etib bo'lmaydi — zaxira va balans allaqachon o'zgargan");
        }
        if (purchaseReturn.getStatus() == PurchaseReturnStatus.REJECTED) {
            throw new BadRequestException("Bu qaytarish allaqachon rad etilgan");
        }

        User currentUser = getCurrentUser();
        purchaseReturn.setStatus(PurchaseReturnStatus.REJECTED);
        purchaseReturn.setApprovedBy(currentUser);
        purchaseReturn.setApprovedAt(LocalDate.now());
        if (reason != null && !reason.isBlank()) {
            String combined = purchaseReturn.getReason() + " | Rad etildi: " + reason.trim();
            purchaseReturn.setReason(combined.length() > 500 ? combined.substring(0, 500) : combined);
        }

        purchaseReturnRepository.save(purchaseReturn);
        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public PurchaseReturnResponse completeReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.APPROVED) {
            throw new BadRequestException("Faqat tasdiqlangan qaytarishlarni yakunlash mumkin");
        }

        User currentUser = getCurrentUser();
        PurchaseOrder purchase = purchaseReturn.getPurchaseOrder();

        // Yakunlashdan OLDIN barcha qatorlar qayta tekshiriladi: guard'dan
        // avval yaratilgan ustma-ust qaytarishlar (yoki oradagi boshqa
        // yakunlangan qaytarish) receivedQuantity'ni manfiyga tushirib,
        // ta'minotchi balansini ikki marta kreditlashi mumkin edi.
        for (PurchaseReturnItem returnItem : purchaseReturn.getItems()) {
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(returnItem.getProduct().getId()))
                    .findFirst()
                    .orElse(null);
            if (purchaseItem != null
                    && returnItem.getReturnedQuantity() > purchaseItem.getReceivedQuantity()) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qaytarish miqdori (%d) qabul qilingan qoldiqdan (%d) ko'p — "
                                + "bu miqdor boshqa qaytarishda allaqachon qaytarilgan",
                        returnItem.getProduct().getName(),
                        returnItem.getReturnedQuantity(),
                        purchaseItem.getReceivedQuantity()));
            }
        }

        // Process each return item
        for (PurchaseReturnItem returnItem : purchaseReturn.getItems()) {
            Product product = returnItem.getProduct();

            // Create stock movement (OUT)
            int previousStock = product.getQuantity();
            int newStock = previousStock - returnItem.getReturnedQuantity();

            // `createReturn` miqdorni faqat qabul qilingan miqdorga solishtiradi, JORIY
            // zaxiraga emas. Oradan vaqt o'tadi (PENDING -> APPROVED -> COMPLETED) va
            // mol sotilib ketgan bo'lishi mumkin: 10 ta olindi -> 8 tasi sotildi ->
            // 10 tasi qaytarildi = zaxira -8. Bu holat stock_movements ledgeriga ham
            // haqiqat sifatida yozilib, barcha ombor hisobotlarini buzardi.
            if (newStock < 0) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qaytarish miqdori (%d) joriy zaxiradan (%d) ko'p — "
                                + "mol allaqachon sotilgan bo'lishi mumkin. Avval zaxirani to'g'rilang.",
                        product.getName(), returnItem.getReturnedQuantity(), previousStock));
            }

            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.OUT)
                    .quantity(returnItem.getReturnedQuantity())
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .referenceType("PURCHASE_RETURN")
                    .referenceId(purchaseReturn.getId())
                    .notes("Qaytarish: " + purchaseReturn.getReturnNumber())
                    .createdBy(currentUser)
                    .build();

            stockMovementRepository.save(movement);

            // Update product stock
            product.setQuantity(newStock);
            productRepository.save(product);

            // Update purchase order item received quantity
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(product.getId()))
                    .findFirst()
                    .orElse(null);

            if (purchaseItem != null) {
                purchaseItem.setReceivedQuantity(
                        purchaseItem.getReceivedQuantity() - returnItem.getReturnedQuantity());
            }
        }

        // Update supplier balance (reduce debt / add credit)
        supplierService.updateBalance(purchase.getSupplier().getId(),
                purchaseReturn.getRefundAmount().negate());

        // Update purchase total and paid amounts
        purchase.setTotalAmount(purchase.getTotalAmount().subtract(purchaseReturn.getRefundAmount()));
        if (purchase.getPaidAmount().compareTo(purchase.getTotalAmount()) > 0) {
            purchase.setPaidAmount(purchase.getTotalAmount());
        }
        purchase.updatePaymentStatus();
        purchaseOrderRepository.save(purchase);

        purchaseReturn.setStatus(PurchaseReturnStatus.COMPLETED);
        purchaseReturnRepository.save(purchaseReturn);

        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public void deleteReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.PENDING) {
            throw new BadRequestException("Faqat kutilayotgan qaytarishlarni o'chirish mumkin");
        }

        purchaseReturnRepository.delete(purchaseReturn);
    }

    // ==================== HELPERS ====================

    /** UZS hujjatda kurs doim 1; boshqa valyutada musbat kurs majburiy. */
    private BigDecimal resolveExchangeRate(PurchaseCurrency currency, BigDecimal requested) {
        if (currency == PurchaseCurrency.UZS) {
            return BigDecimal.ONE;
        }
        if (requested == null || requested.signum() <= 0) {
            throw new BadRequestException(currency + " hujjat uchun valyuta kursi kiritilishi shart");
        }
        return requested.setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * Omborga kirim: harakat yozuvi + mahsulot qoldig'i + tannarx.
     *
     * <p>Tannarx sifatida QATOR TANNARXI (bonus va yo'l haqi hisobga olingan)
     * yoziladi — foyda hisobi haqiqiy xarajatni ko'rsin.
     */
    private void applyStockIn(PurchaseOrder purchase, PurchaseOrderItem item, int quantity, User user) {
        Product product = item.getProduct();
        int previousStock = product.getQuantity();
        int newStock = previousStock + quantity;

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(MovementType.IN)
                .quantity(quantity)
                .previousStock(previousStock)
                .newStock(newStock)
                .referenceType("PURCHASE")
                .referenceId(purchase.getId())
                .notes("Xarid: " + purchase.getOrderNumber())
                .supplier(purchase.getSupplier())
                .unitPrice(item.effectiveLandedUnitCost())
                .createdBy(user)
                .build();
        stockMovementRepository.save(movement);

        product.setQuantity(newStock);
        product.setPurchasePrice(item.effectiveLandedUnitCost());
        productRepository.save(product);
    }

    private void stampReceived(PurchaseOrder purchase, User user) {
        purchase.setReceivedDate(LocalDate.now());
        purchase.setReceivedBy(user);
        purchase.setReceivedAt(LocalDateTime.now());
    }

    /** notes VARCHAR(500) — uzun tarixda oshib ketmasligi uchun kesiladi. */
    private void appendNote(PurchaseOrder purchase, String note) {
        String combined = (purchase.getNotes() == null || purchase.getNotes().isBlank())
                ? note : purchase.getNotes() + "; " + note;
        purchase.setNotes(combined.length() > 500 ? combined.substring(0, 500) : combined);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private PaymentStatus calculatePaymentStatus(BigDecimal paidAmount, BigDecimal totalAmount) {
        if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) == 0) {
            return PaymentStatus.UNPAID;
        } else if (paidAmount.compareTo(totalAmount) >= 0) {
            return PaymentStatus.PAID;
        } else {
            return PaymentStatus.PARTIAL;
        }
    }

    /** Xarid raqami — atomik (ilgari "MAX(...) + 1" poygaga sabab bo'lardi). */
    private String generateOrderNumber() {
        return documentNumberService.nextPurchaseOrderNumber();
    }

    /** Qaytarish raqami — atomik (ilgari "MAX(...) + 1" poygaga sabab bo'lardi). */
    private String generateReturnNumber() {
        return documentNumberService.nextPurchaseReturnNumber();
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }

    private PurchaseOrderResponse mapToResponse(PurchaseOrder purchase) {
        int itemCount = purchase.getItems().size();
        int totalQuantity = purchase.getItems().stream()
                .mapToInt(PurchaseOrderItem::getOrderedQuantity)
                .sum();
        int totalReceived = purchase.getItems().stream()
                .mapToInt(i -> i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0)
                .sum();
        int paymentCount = purchase.getPayments() != null ? purchase.getPayments().size() : 0;
        int returnCount = purchase.getReturns() != null ? purchase.getReturns().size() : 0;

        // Kamomad faqat sanab qabul qilingan hujjatda ma'noga ega — kutilayotgan
        // hujjatda hali hech narsa kelmagan, bu kamomad emas.
        boolean counted = purchase.getStatus() == PurchaseOrderStatus.RECEIVED
                || purchase.getStatus() == PurchaseOrderStatus.PARTIAL;
        int shortage = counted ? purchase.getItems().stream()
                .mapToInt(i -> Math.max(0, i.getOrderedQuantity()
                        - (i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0)))
                .sum() : 0;

        return PurchaseOrderResponse.builder()
                .id(purchase.getId())
                .orderNumber(purchase.getOrderNumber())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getName())
                .orderDate(purchase.getOrderDate())
                .dueDate(purchase.getDueDate())
                .totalAmount(purchase.getTotalAmount())
                .paidAmount(purchase.getPaidAmount())
                // Oldindan to'lov kam kelgan moldan ortiq bo'lsa qarz manfiy
                // chiqardi — ortiqcha pul ta'minotchi balansida ko'rinadi.
                .debtAmount(purchase.getTotalAmount().subtract(purchase.getPaidAmount()).max(BigDecimal.ZERO))
                .status(purchase.getStatus())
                .paymentStatus(purchase.getPaymentStatus())
                .notes(purchase.getNotes())
                .itemCount(itemCount)
                .totalQuantity(totalQuantity)
                .totalReceivedQuantity(totalReceived)
                .shortageQuantity(shortage)
                .paymentCount(paymentCount)
                .returnCount(returnCount)
                .createdAt(purchase.getCreatedAt())
                .createdByName(purchase.getCreatedBy().getFullName())
                .supplierDocNumber(purchase.getSupplierDocNumber())
                .supplierDocDate(purchase.getSupplierDocDate())
                .vehicleNumber(purchase.getVehicleNumber())
                .currency(purchase.getCurrency())
                .exchangeRate(purchase.getExchangeRate())
                .foreignTotalAmount(purchase.getForeignTotalAmount())
                .goodsAmount(purchase.getGoodsAmount())
                .bonusAmount(purchase.getBonusAmount())
                .transportCost(purchase.getTransportCost())
                .receivedByName(purchase.getReceivedBy() != null ? purchase.getReceivedBy().getFullName() : null)
                .receivedAt(purchase.getReceivedAt())
                .build();
    }

    private PurchaseOrderResponse mapToResponseWithItems(PurchaseOrder purchase) {
        PurchaseOrderResponse response = mapToResponse(purchase);

        List<PurchaseItemResponse> items = purchase.getItems().stream()
                .map(item -> PurchaseItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .sizeString(item.getProduct().getSizeString())
                        .quantity(item.getOrderedQuantity())
                        .orderedQuantity(item.getOrderedQuantity())
                        .receivedQuantity(item.getReceivedQuantity() != null ? item.getReceivedQuantity() : 0)
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .foreignUnitPrice(item.getForeignUnitPrice())
                        .bonusPerUnit(item.getBonusPerUnit())
                        .bonusPercent(item.getBonusPercent())
                        .bonusAmount(item.getBonusAmount())
                        .landedUnitCost(item.effectiveLandedUnitCost())
                        .build())
                .collect(Collectors.toList());

        response.setItems(items);
        return response;
    }

    private PurchasePaymentResponse mapToPaymentResponse(PurchasePayment payment) {
        return PurchasePaymentResponse.builder()
                .id(payment.getId())
                .purchaseOrderId(payment.getPurchaseOrder().getId())
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .paymentMethod(payment.getPaymentMethod())
                .referenceNumber(payment.getReferenceNumber())
                .notes(payment.getNotes())
                .receivedByName(payment.getReceivedBy().getFullName())
                .createdAt(payment.getCreatedAt())
                .build();
    }

    private PurchaseReturnResponse mapToReturnResponse(PurchaseReturn purchaseReturn) {
        List<PurchaseReturnItemResponse> items = purchaseReturn.getItems().stream()
                .map(item -> PurchaseReturnItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .returnedQuantity(item.getReturnedQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return PurchaseReturnResponse.builder()
                .id(purchaseReturn.getId())
                .returnNumber(purchaseReturn.getReturnNumber())
                .purchaseOrderId(purchaseReturn.getPurchaseOrder().getId())
                .purchaseOrderNumber(purchaseReturn.getPurchaseOrder().getOrderNumber())
                .supplierId(purchaseReturn.getPurchaseOrder().getSupplier().getId())
                .supplierName(purchaseReturn.getPurchaseOrder().getSupplier().getName())
                .returnDate(purchaseReturn.getReturnDate())
                .reason(purchaseReturn.getReason())
                .status(purchaseReturn.getStatus())
                .refundAmount(purchaseReturn.getRefundAmount())
                .items(items)
                .createdByName(purchaseReturn.getCreatedBy().getFullName())
                .approvedByName(purchaseReturn.getApprovedBy() != null ?
                        purchaseReturn.getApprovedBy().getFullName() : null)
                .approvedAt(purchaseReturn.getApprovedAt())
                .createdAt(purchaseReturn.getCreatedAt())
                .build();
    }
}
