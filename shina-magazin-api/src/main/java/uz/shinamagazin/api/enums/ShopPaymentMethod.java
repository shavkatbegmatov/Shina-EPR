package uz.shinamagazin.api.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

/**
 * Storefront buyurtmasi to'lov usuli. ERP `PaymentMethod`'dan alohida —
 * mijozga ko'rinadigan to'lov kanallari (naqd / karta / Payme / Click).
 * Haqiqiy to'lov shlyuzi (gateway) integratsiyasi keyingi bosqichda.
 */
public enum ShopPaymentMethod {
    CASH,
    CARD,
    PAYME,
    CLICK;

    @JsonCreator
    public static ShopPaymentMethod fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
