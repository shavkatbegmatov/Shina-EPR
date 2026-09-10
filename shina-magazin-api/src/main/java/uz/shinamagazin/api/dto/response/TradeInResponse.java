package uz.shinamagazin.api.dto.response;

import lombok.*;
import uz.shinamagazin.api.entity.TradeIn;
import uz.shinamagazin.api.enums.TradeInStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Barter hujjati — qabul qilingan eski shinalar. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInResponse {

    private Long id;
    private String documentNumber;
    private Long customerId;
    private String customerName;
    /** Qaysi savdoda ishlatilgan; NULL = hali ishlatilmagan. */
    private Long saleId;
    private String invoiceNumber;
    private LocalDateTime acceptedAt;
    private TradeInStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private String createdByName;
    private List<Item> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitValue;
        private BigDecimal totalValue;
        private String conditionNote;
    }

    public static TradeInResponse from(TradeIn tradeIn) {
        return TradeInResponse.builder()
                .id(tradeIn.getId())
                .documentNumber(tradeIn.getDocumentNumber())
                .customerId(tradeIn.getCustomer() != null ? tradeIn.getCustomer().getId() : null)
                .customerName(tradeIn.getCustomer() != null ? tradeIn.getCustomer().getFullName() : null)
                .saleId(tradeIn.getSale() != null ? tradeIn.getSale().getId() : null)
                .invoiceNumber(tradeIn.getSale() != null ? tradeIn.getSale().getInvoiceNumber() : null)
                .acceptedAt(tradeIn.getAcceptedAt())
                .status(tradeIn.getStatus())
                .totalAmount(tradeIn.getTotalAmount())
                .notes(tradeIn.getNotes())
                .createdByName(tradeIn.getCreatedBy() != null ? tradeIn.getCreatedBy().getFullName() : null)
                .items(tradeIn.getItems().stream()
                        .map(i -> Item.builder()
                                .productId(i.getProduct().getId())
                                .productName(i.getProduct().getName())
                                .quantity(i.getQuantity())
                                .unitValue(i.getUnitValue())
                                .totalValue(i.getTotalValue())
                                .conditionNote(i.getConditionNote())
                                .build())
                        .toList())
                .build();
    }
}
