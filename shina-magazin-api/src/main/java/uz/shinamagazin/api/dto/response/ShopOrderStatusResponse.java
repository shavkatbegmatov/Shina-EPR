package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;
import uz.shinamagazin.api.entity.ShopOrder;

/**
 * Buyurtma holatining OMMAVIY (guest) javobi — shaxsiy ma'lumotsiz.
 *
 * Faqat orderNo + buyurtma holati + to'lov holatini qaytaradi (ism/telefon/
 * manzil yo'q), shu sababli auth talab qilmaydi. Tasdiq sahifasi to'lovdan
 * qaytgach real paymentStatus (PAID/PENDING) ni shu endpoint orqali oladi.
 */
@Data
@Builder
public class ShopOrderStatusResponse {
    private String orderNo;
    private String status;
    private String paymentStatus;

    public static ShopOrderStatusResponse from(ShopOrder o) {
        return ShopOrderStatusResponse.builder()
                .orderNo(o.getOrderNo())
                .status(o.getStatus() != null ? o.getStatus().name() : null)
                .paymentStatus(o.getPaymentStatus() != null ? o.getPaymentStatus().name() : null)
                .build();
    }
}
