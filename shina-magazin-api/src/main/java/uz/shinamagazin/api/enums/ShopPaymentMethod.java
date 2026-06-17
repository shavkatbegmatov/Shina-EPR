package uz.shinamagazin.api.enums;

/**
 * Storefront buyurtmasi to'lov usuli. ERP `PaymentMethod`'dan alohida —
 * mijozga ko'rinadigan to'lov kanallari (naqd / karta / Payme / Click).
 * Haqiqiy to'lov shlyuzi (gateway) integratsiyasi keyingi bosqichda.
 */
public enum ShopPaymentMethod {
    CASH,
    CARD,
    PAYME,
    CLICK
}
