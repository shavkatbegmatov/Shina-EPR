package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.TradeInItem;

import java.math.BigDecimal;

/** Barter hujjatining qatori — qabul qilingan eski shina. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String sizeString;
    private Integer quantity;
    private BigDecimal unitValue;
    private BigDecimal totalValue;
    private String description;

    public static TradeInItemResponse from(TradeInItem item) {
        return TradeInItemResponse.builder()
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
