package uz.shinamagazin.api.dto.response;

import lombok.*;
import uz.shinamagazin.api.entity.SaleReturn;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Qaytarish hujjati. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleReturnResponse {

    private Long id;
    private String returnNumber;
    private Long saleId;
    private String invoiceNumber;
    private LocalDateTime returnDate;
    private String reason;
    private BigDecimal refundAmount;
    /** Qarzni kamaytirishga ketgan qism. */
    private BigDecimal debtReduced;
    /** Mijozga haqiqatan qaytarilgan pul. */
    private BigDecimal cashRefunded;
    private String createdByName;
    private List<Item> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long saleItemId;
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }

    public static SaleReturnResponse from(SaleReturn ret) {
        return SaleReturnResponse.builder()
                .id(ret.getId())
                .returnNumber(ret.getReturnNumber())
                .saleId(ret.getSale() != null ? ret.getSale().getId() : null)
                .invoiceNumber(ret.getSale() != null ? ret.getSale().getInvoiceNumber() : null)
                .returnDate(ret.getReturnDate())
                .reason(ret.getReason())
                .refundAmount(ret.getRefundAmount())
                .debtReduced(ret.getDebtReduced())
                .cashRefunded(ret.getCashRefunded())
                .createdByName(ret.getCreatedBy() != null ? ret.getCreatedBy().getFullName() : null)
                .items(ret.getItems().stream()
                        .map(i -> Item.builder()
                                .saleItemId(i.getSaleItem().getId())
                                .productId(i.getProduct().getId())
                                .productName(i.getProduct().getName())
                                .quantity(i.getQuantity())
                                .unitPrice(i.getUnitPrice())
                                .totalPrice(i.getTotalPrice())
                                .build())
                        .toList())
                .build();
    }
}
