package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.SaleTradeInItem;

import java.math.BigDecimal;

/** Barter qatori — savdoda qabul qilingan eski shina. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleTradeInItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String sizeString;
    private Integer quantity;
    private BigDecimal unitValue;
    private BigDecimal totalValue;
    private String description;

    public static SaleTradeInItemResponse from(SaleTradeInItem item) {
        return SaleTradeInItemResponse.builder()
                .id(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .productSku(item.getProduct().getSku())
                .sizeString(item.getProduct().getSizeString())
                .quantity(item.getQuantity())
                .unitValue(item.getUnitValue())
                .totalValue(item.getTotalValue())
                .description(item.getDescription())
                .build();
    }
}
