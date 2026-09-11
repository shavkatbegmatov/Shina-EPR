package uz.shinamagazin.api.enums;

/**
 * Kirim hujjati valyutasi.
 *
 * <p>Ulgurji shina savdosida ta'minotchi yuk xati ko'pincha DOLLARDA keladi
 * ("Narx: 46,25"). Tizimning pul ustunlari esa so'mda — shuning uchun hujjat
 * o'z valyutasida kiritiladi, kurs saqlanadi, so'mga aylantirishni server
 * qiladi. {@code UZS} hujjatda kurs 1 ga teng.
 */
public enum PurchaseCurrency {
    UZS,
    USD
}
