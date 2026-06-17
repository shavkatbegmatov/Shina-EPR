package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.entity.ShopOrderItem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Storefront buyurtma javobi. */
@Data
@Builder
public class ShopOrderResponse {
    private String orderNo;
    private String status;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String deliveryMethod;
    private String deliveryAddress;
    private String deliveryNote;
    private String paymentMethod;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private List<Item> items;

    @Data
    @Builder
    public static class Item {
        private Long productId;
        private String productName;
        private String sizeString;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;

        public static Item from(ShopOrderItem i) {
            return Item.builder()
                    .productId(i.getProduct() != null ? i.getProduct().getId() : null)
                    .productName(i.getProductName())
                    .sizeString(i.getSizeString())
                    .quantity(i.getQuantity())
                    .unitPrice(i.getUnitPrice())
                    .totalPrice(i.getTotalPrice())
                    .build();
        }
    }

    public static ShopOrderResponse from(ShopOrder o) {
        return ShopOrderResponse.builder()
                .orderNo(o.getOrderNo())
                .status(o.getStatus() != null ? o.getStatus().name() : null)
                .customerName(o.getCustomerName())
                .customerPhone(o.getCustomerPhone())
                .customerEmail(o.getCustomerEmail())
                .deliveryMethod(o.getDeliveryMethod() != null ? o.getDeliveryMethod().name() : null)
                .deliveryAddress(o.getDeliveryAddress())
                .deliveryNote(o.getDeliveryNote())
                .paymentMethod(o.getPaymentMethod() != null ? o.getPaymentMethod().name() : null)
                .subtotal(o.getSubtotal())
                .deliveryFee(o.getDeliveryFee())
                .totalAmount(o.getTotalAmount())
                .createdAt(o.getCreatedAt())
                .items(o.getItems().stream().map(Item::from).toList())
                .build();
    }
}
