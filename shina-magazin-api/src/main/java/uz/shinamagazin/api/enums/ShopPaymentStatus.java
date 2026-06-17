package uz.shinamagazin.api.enums;

/**
 * Storefront buyurtmasi to'lov holati.
 * PENDING — kutilmoqda (naqd/yetkazishda yoki onlayn boshlanmagan);
 * PROCESSING — onlayn to'lov boshlandi (provayder sahifasiga yuborildi);
 * PAID — to'landi (provayder tasdiqladi); FAILED — muvaffaqiyatsiz;
 * CANCELLED — bekor qilindi; REFUNDED — qaytarildi.
 */
public enum ShopPaymentStatus {
    PENDING,
    PROCESSING,
    PAID,
    FAILED,
    CANCELLED,
    REFUNDED
}
