package uz.shinamagazin.api.enums;

/** Xodimlikka ro'yxatdan o'tish so'rovining holati. */
public enum StaffRegistrationStatus {
    /** Yuborilgan, xodim hali ko'rib chiqmagan. */
    PENDING,
    /** Tasdiqlangan — xodim yozuvi va akkaunt yaratilgan. */
    APPROVED,
    /** Rad etilgan. Odam ma'lumotlarini to'g'rilab qayta yubora oladi. */
    REJECTED
}
