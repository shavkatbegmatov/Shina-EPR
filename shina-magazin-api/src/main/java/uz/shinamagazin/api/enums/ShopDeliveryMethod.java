package uz.shinamagazin.api.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

/** Storefront buyurtmasi yetkazib berish usuli. */
public enum ShopDeliveryMethod {
    DELIVERY,
    PICKUP;

    @JsonCreator
    public static ShopDeliveryMethod fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
