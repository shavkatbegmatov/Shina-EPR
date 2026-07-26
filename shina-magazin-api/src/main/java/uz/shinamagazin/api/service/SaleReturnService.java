package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CreateSaleReturnRequest;
import uz.shinamagazin.api.dto.response.SaleReturnResponse;
import uz.shinamagazin.api.entity.*;
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

        for (CreateSaleReturnRequest.Item requested : request.getItems()) {
            SaleItem soldItem = itemsById.get(requested.getSaleItemId());
            if (soldItem == null) {
                throw new BadRequestException("Bu savdo qatori topilmadi: " + requested.getSaleItemId());
            }

            long remaining = soldItem.getQuantity()
                    - alreadyReturned.getOrDefault(soldItem.getId(), 0L);
            if (requested.getQuantity() > remaining) {
                throw new BadRequestException(String.format(
                        "\"%s\" uchun qaytarish mumkin bo'lgan miqdor: %d (so'ralgan: %d)",
                        soldItem.getProduct().getName(), remaining, requested.getQuantity()));
            }

            // Narx AYNAN o'sha qatordan: bir mahsulot bitta savdoda turli
            // chegirma bilan ikki qatorda bo'lishi mumkin.
            BigDecimal unitPrice = effectiveUnitPrice(soldItem);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(requested.getQuantity()));
            refundAmount = refundAmount.add(lineTotal);

            saleReturn.addItem(SaleReturnItem.builder()
                    .saleItem(soldItem)
                    .product(soldItem.getProduct())
                    .quantity(requested.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build());

            restoreStock(soldItem.getProduct(), requested.getQuantity(), sale, currentUser);
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
     * Qator uchun haqiqiy birlik narxi — chegirma hisobga olingan holda.
     *
     * <p>{@code totalPrice / quantity} olinadi, {@code unitPrice} emas: qatorga
     * chegirma qo'llangan bo'lsa mijoz kamroq to'lagan va aynan shuncha
     * qaytarilishi kerak.
     */
    private BigDecimal effectiveUnitPrice(SaleItem item) {
        if (item.getQuantity() == null || item.getQuantity() == 0) {
            return item.getUnitPrice();
        }
        return item.getTotalPrice().divide(
                BigDecimal.valueOf(item.getQuantity()), 2, java.math.RoundingMode.HALF_UP);
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
