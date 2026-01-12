package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseReturnItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private Integer returnedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
}
