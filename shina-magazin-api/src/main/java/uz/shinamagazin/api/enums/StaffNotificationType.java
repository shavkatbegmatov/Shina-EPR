package uz.shinamagazin.api.enums;

/**
 * Xodimlar bildirishnomasi turlari
 */
public enum StaffNotificationType {
    ORDER,      // Yangi buyurtma
    PAYMENT,    // To'lov qabul qilindi
    WARNING,    // Ogohlantirish (kam zaxira, qarz muddati)
    CUSTOMER,   // Yangi mijoz
    INFO,       // Ma'lumot (mahsulot qo'shildi, ta'minotchi)
    SUCCESS     // Muvaffaqiyat (sotuv yakunlandi)
}
