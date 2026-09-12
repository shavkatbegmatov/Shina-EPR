package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.TradeIn;
import uz.shinamagazin.api.enums.TradeInStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Barter hujjati — mijozdan qabul qilingan eski shinalar. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInResponse {

    private Long id;
    private String documentNumber;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    /** Qaysi savdoda ishlatilgan; NULL = hali ishlatilmagan. */
    private Long saleId;
    private String invoiceNumber;
    private LocalDateTime acceptedAt;
    /** Kassada savdo ichida qabul qilingan (true) yoki Barter sahifasida, oldindan (false). */
    private boolean acceptedInSale;
    private TradeInStatus status;
    private BigDecimal totalAmount;
    private Integer totalQuantity;
    private String notes;
    private String createdByName;
    private List<TradeInItemResponse> items;

    public static TradeInResponse from(TradeIn tradeIn) {
        List<TradeInItemResponse> items = tradeIn.getItems().stream()
                .map(TradeInItemResponse::from)
                .toList();
        return TradeInResponse.builder()
                .id(tradeIn.getId())
                .documentNumber(tradeIn.getDocumentNumber())
                .customerId(tradeIn.getCustomer() != null ? tradeIn.getCustomer().getId() : null)
                .customerName(tradeIn.getCustomer() != null ? tradeIn.getCustomer().getFullName() : null)
                .customerPhone(tradeIn.getCustomer() != null ? tradeIn.getCustomer().getPhone() : null)
                .saleId(tradeIn.getSale() != null ? tradeIn.getSale().getId() : null)
                .invoiceNumber(tradeIn.getSale() != null ? tradeIn.getSale().getInvoiceNumber() : null)
                .acceptedAt(tradeIn.getAcceptedAt())
                .acceptedInSale(tradeIn.isAcceptedInSale())
                .status(tradeIn.getStatus())
                .totalAmount(tradeIn.getTotalAmount())
                .totalQuantity(items.stream().mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum())
                .notes(tradeIn.getNotes())
                .createdByName(tradeIn.getCreatedBy() != null ? tradeIn.getCreatedBy().getFullName() : null)
                .items(items)
                .build();
    }
}
