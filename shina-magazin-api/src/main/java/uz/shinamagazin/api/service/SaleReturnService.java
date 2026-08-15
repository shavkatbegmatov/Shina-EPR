package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CreateSaleReturnRequest;
import uz.shinamagazin.api.dto.response.SaleReturnResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.DebtStatus;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.SaleStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Savdo qaytarish.
 *
 * <p>`SALES_REFUND` ruxsati va `REFUNDED` status ilgari ham bor edi, lekin
 * ularni ishlatadigan metod yo'q edi — mijoz shinani qaytarsa uni tizimda
 * rasmiylashtirib bo'lmasdi: zaxira tiklanmasdi, pul qaytgani qayd etilmasdi.
 *
 * <p>Qaytarish bir bosqichli: mijoz tovarni olib keladi, kassir rasmiylashtiradi,
 * pul qaytadi. Xarid qaytarishidagi (ta'minotchiga) PENDING→APPROVED→COMPLETED
 * oqimi bu yerda ortiqcha — u yerda tasdiq kerak, chunki ta'minotchi bilan
 * kelishuv talab qilinadi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SaleReturnService {

    private final SaleReturnRepository saleReturnRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final DocumentNumberService documentNumberService;
    private final CashShiftService cashShiftService;
    private final DebtRepository debtRepository;

    @Transactional(readOnly = true)
    public List<SaleReturnResponse> getBySale(Long saleId) {
        return saleReturnRepository.findBySaleIdOrderByReturnDateDesc(saleId).stream()
                .map(SaleReturnResponse::from)
                .toList();
    }

    /**
     * Qaytarishni rasmiylashtiradi: zaxira tiklanadi, pul qaytariladi,
     * hammasi qaytarilgan bo'lsa savdo REFUNDED holatiga o'tadi.
     */
    @Transactional
    public SaleReturnResponse createReturn(Long saleId, Long userId, CreateSaleReturnRequest request) {
        Sale sale = saleRepository.findByIdWithItems(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Sotuv", "id", saleId));

        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new BadRequestException("Bekor qilingan savdodan qaytarib bo'lmaydi");
        }

        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        Map<Long, SaleItem> itemsById = new HashMap<>();
        sale.getItems().forEach(i -> itemsById.put(i.getId(), i));
        Map<Long, Long> alreadyReturned = saleReturnRepository.returnedQuantitiesBySale(saleId);

        SaleReturn saleReturn = SaleReturn.builder()
                .returnNumber(documentNumberService.nextSaleReturnNumber())
                .sale(sale)
                .returnDate(LocalDateTime.now())
                .reason(request.getReason())
                .createdBy(currentUser)
                .shift(cashShiftService.findOpenShift(userId).orElse(null))
                .refundAmount(BigDecimal.ZERO)
                .build();

        BigDecimal refundAmount = BigDecimal.ZERO;

        // Bitta so'rov ICHIDA bir qator bir necha marta kelishi mumkin. Miqdor
        // chegarasi har qatorni mustaqil tekshirgani uchun ular bir xil
        // qoldiqni ko'rib, ikkalasi ham o'tardi: `restoreStock` har biri uchun
        // ishlab, MAVJUD BO'LMAGAN zaxira paydo qilardi (pul tomoni ham faqat
        // butun savdo summasi bilan cheklangan edi). Shuning uchun qatorlar
        // avval saleItemId bo'yicha YIG'ILADI.
        Map<Long, Integer> requestedByItem = new java.util.LinkedHashMap<>();
        request.getItems().forEach(i ->
                requestedByItem.merge(i.getSaleItemId(), i.getQuantity(), Integer::sum));

        for (Map.Entry<Long, Integer> requested : requestedByItem.entrySet()) {
            SaleItem soldItem = itemsById.get(requested.getKey());
            if (soldItem == null) {
                throw new BadRequestException("Bu savdo qatori topilmadi: " + requested.getKey());
            }

            int quantity = requested.getValue();
            long remaining = soldItem.getQuantity()
                    - alreadyReturned.getOrDefault(soldItem.getId(), 0L);
            if (quantity > remaining) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qaytarish mumkin bo'lgan miqdor: %d (so'ralgan: %d)",
                        soldItem.getProduct().getName(), remaining, quantity));
            }

            // Narx AYNAN o'sha qatordan: bir mahsulot bitta savdoda turli
            // chegirma bilan ikki qatorda bo'lishi mumkin.
            BigDecimal unitPrice = effectiveUnitPrice(sale, soldItem);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
            refundAmount = refundAmount.add(lineTotal);

            saleReturn.addItem(SaleReturnItem.builder()
                    .saleItem(soldItem)
                    .product(soldItem.getProduct())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build());

            restoreStock(soldItem.getProduct(), quantity, sale, currentUser);
        }

        // Jami qaytarish savdo summasidan oshmasligi kerak. Miqdor chegarasi
        // yuqorida tekshirilgan, lekin qatorlar bo'yicha yaxlitlash tiyinlik
        // farq berishi mumkin — u esa `paidAmount` ni manfiyga olib chiqardi.
        BigDecimal maxRefundable = sale.getTotalAmount()
                .subtract(saleReturnRepository.sumRefundedBySale(saleId));
        if (refundAmount.compareTo(maxRefundable) > 0) {
            refundAmount = maxRefundable.max(BigDecimal.ZERO);
        }

        // ─── Pul taqsimoti ───
        // Avval mijozning shu savdo bo'yicha QARZI kamaytiriladi (pul chiqmaydi),
        // qolgani naqd qaytariladi. Aks holda qarzga olgan mijoz tovarni
        // qaytarib, ustiga naqd pul ham olib ketardi.
        BigDecimal outstandingDebt = sale.getDebtAmount() != null ? sale.getDebtAmount() : BigDecimal.ZERO;
        BigDecimal debtReduced = refundAmount.min(outstandingDebt);
        BigDecimal cashRefunded = refundAmount.subtract(debtReduced);

        saleReturn.setRefundAmount(refundAmount);
        saleReturn.setDebtReduced(debtReduced);
        saleReturn.setCashRefunded(cashRefunded);

        if (debtReduced.signum() > 0) {
            sale.setDebtAmount(outstandingDebt.subtract(debtReduced));
            if (sale.getCustomer() != null) {
                Customer customer = sale.getCustomer();
                customer.setBalance(customer.getBalance().add(debtReduced));
                customerRepository.save(customer);
            }
            reduceDebtRecords(sale, debtReduced, saleReturn.getReturnNumber());
        }
        if (cashRefunded.signum() > 0) {
            sale.setPaidAmount(sale.getPaidAmount().subtract(cashRefunded));
        }

        // Hammasi qaytarilgan bo'lsa — savdo REFUNDED
        if (isFullyReturned(sale, alreadyReturned, request)) {
            sale.setStatus(SaleStatus.REFUNDED);
        }
        saleRepository.save(sale);

        SaleReturn saved = saleReturnRepository.save(saleReturn);
        log.info("Savdo qaytarildi: {} (savdo {}), summa={}, qarzdan={}, naqd={}",
                saved.getReturnNumber(), sale.getInvoiceNumber(),
                refundAmount, debtReduced, cashRefunded);

        return SaleReturnResponse.from(saved);
    }

    /**
     * Qator uchun haqiqiy birlik narxi — HAR IKKALA chegirma hisobga olingan.
     *
     * <p>Ikki daraja chegirma bo'lishi mumkin:
     * <ul>
     *   <li>QATOR chegirmasi — u {@code totalPrice} da allaqachon hisobga
     *       olingan, shuning uchun {@code unitPrice} emas, {@code totalPrice /
     *       quantity} olinadi;
     *   <li>SAVDO chegirmasi ({@code sale.discountAmount}, masalan
     *       "yaxlitladik") — u qatorlarda umuman ko'rinmaydi. Uni hisobga
     *       olmaslik do'konga real ZARAR keltirardi: 2 000 000 lik tovarni
     *       200 000 chegirma bilan 1 800 000 ga olgan mijoz hammasini
     *       qaytarganda kassadan 2 000 000 chiqib ketardi.
     * </ul>
     *
     * <p>Savdo chegirmasi qatorlarga ulushga qarab taqsimlanadi.
     */
    private BigDecimal effectiveUnitPrice(Sale sale, SaleItem item) {
        if (item.getQuantity() == null || item.getQuantity() == 0) {
            return item.getUnitPrice();
        }
        BigDecimal lineTotal = applySaleDiscount(sale, item.getTotalPrice());
        return lineTotal.divide(
                BigDecimal.valueOf(item.getQuantity()), 2, java.math.RoundingMode.HALF_UP);
    }

    /** {@code lineTotal × totalAmount / subtotal} — savdo chegirmasining qatordagi ulushi. */
    private BigDecimal applySaleDiscount(Sale sale, BigDecimal lineTotal) {
        BigDecimal subtotal = sale.getSubtotal();
        BigDecimal total = sale.getTotalAmount();

        if (subtotal == null || subtotal.signum() == 0 || total == null
                || subtotal.compareTo(total) == 0) {
            return lineTotal;
        }
        return lineTotal.multiply(total)
                .divide(subtotal, 2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * `debts` jadvalini `sale.debtAmount` bilan sinxron kamaytiradi.
     *
     * <p>Busiz qaytarishda faqat `sale.debtAmount` kamayib, `debts` qatori
     * to'liq summa bilan ACTIVE qolaverardi: dashboard va eslatmalar mavjud
     * bo'lmagan qarzni ko'rsatar, kassir esa uni "undirib" mijozdan
     * qaytarilgan tovar uchun ikkinchi marta pul olishi mumkin edi.
     */
    private void reduceDebtRecords(Sale sale, BigDecimal amount, String returnNumber) {
        BigDecimal left = amount;
        for (Debt debt : debtRepository.findBySaleIdAndRemainingAmountGreaterThanOrderByIdAsc(
                sale.getId(), BigDecimal.ZERO)) {
            if (left.signum() <= 0) {
                break;
            }
            BigDecimal cut = left.min(debt.getRemainingAmount());
            debt.setRemainingAmount(debt.getRemainingAmount().subtract(cut));
            if (debt.getRemainingAmount().signum() == 0) {
                debt.setStatus(DebtStatus.CANCELLED);
            }
            appendDebtNote(debt, "Qaytarish " + returnNumber + ": -" + cut);
            debtRepository.save(debt);
            left = left.subtract(cut);
        }
        if (left.signum() > 0) {
            log.warn("Qaytarish {}: savdo {} uchun qarz yozuvlari yetmadi, {} sinxronlanmadi",
                    returnNumber, sale.getInvoiceNumber(), left);
        }
    }

    /** notes VARCHAR(500) — uzun tarixda oshib ketmasligi uchun kesiladi. */
    private void appendDebtNote(Debt debt, String note) {
        String combined = (debt.getNotes() == null || debt.getNotes().isBlank())
                ? note : debt.getNotes() + "; " + note;
        debt.setNotes(combined.length() > 500 ? combined.substring(0, 500) : combined);
    }

    private void restoreStock(Product product, int quantity, Sale sale, User user) {
        int previousStock = product.getQuantity();
        product.setQuantity(previousStock + quantity);
        productRepository.save(product);

        stockMovementRepository.save(StockMovement.builder()
                .product(product)
                .movementType(MovementType.IN)
                .quantity(quantity)
                .previousStock(previousStock)
                .newStock(product.getQuantity())
                .referenceType("SALE_RETURN")
                .referenceId(sale.getId())
                .notes("Qaytarish: " + sale.getInvoiceNumber())
                .createdBy(user)
                .build());
    }

    /** Shu qaytarishdan keyin savdodagi barcha qatorlar to'liq qaytarilganmi. */
    private boolean isFullyReturned(Sale sale, Map<Long, Long> alreadyReturned,
                                    CreateSaleReturnRequest request) {
        Map<Long, Long> afterThis = new HashMap<>(alreadyReturned);
        request.getItems().forEach(i ->
                afterThis.merge(i.getSaleItemId(), (long) i.getQuantity(), Long::sum));

        return sale.getItems().stream()
                .allMatch(item -> afterThis.getOrDefault(item.getId(), 0L) >= item.getQuantity());
    }
}
