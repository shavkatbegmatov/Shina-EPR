package uz.shinamagazin.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Storefront to'lov sozlamalari (application.yml: `shop.payment.*`).
 *
 * Default: provayderlar O'CHIQ va kreditsiallar bo'sh — foydalanuvchi merchant
 * hisobini olgach to'ldiradi (Payme merchantId/key, Click merchantId/serviceId/
 * secretKey). Yoqilmagan provayder uchun checkout URL yaratilmaydi (fallback: naqd).
 */
@Component
@ConfigurationProperties(prefix = "shop.payment")
@Data
public class PaymentProperties {

    /** Frontend buyurtma tasdiq sahifasi (provayderdan qaytish uchun) */
    private String returnUrl = "http://localhost:5183/magazin/buyurtma";

    private Payme payme = new Payme();
    private Click click = new Click();

    @Data
    public static class Payme {
        private boolean enabled = false;
        private String merchantId = "";
        /** Merchant API kaliti — webhook Basic-auth tekshiruvi uchun */
        private String key = "";
        private String checkoutUrl = "https://checkout.paycom.uz";
    }

    @Data
    public static class Click {
        private boolean enabled = false;
        private String merchantId = "";
        private String serviceId = "";
        /** Prepare/Complete imzo (MD5) tekshiruvi uchun maxfiy kalit */
        private String secretKey = "";
        private String payUrl = "https://my.click.uz/services/pay";
    }
}
