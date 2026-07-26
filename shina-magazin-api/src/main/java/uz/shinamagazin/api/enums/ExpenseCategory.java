package uz.shinamagazin.api.enums;

/**
 * Xarajat turkumi.
 *
 * <p>Ataylab ENUM, alohida jadval emas: do'kon xarajatlari turlari deyarli
 * o'zgarmaydi, jadval esa qo'shimcha CRUD sahifa va "kategoriya o'chirilsa
 * xarajatlar nima bo'ladi" muammosini olib kelardi. Yangi tur kerak bo'lsa
 * shu ro'yxatga qo'shiladi.
 */
public enum ExpenseCategory {
    RENT,           // Ijara
    SALARY,         // Ish haqi
    UTILITIES,      // Kommunal (svet, suv, gaz, internet)
    TRANSPORT,      // Transport, yetkazib berish
    SUPPLIES,       // Xo'jalik mollari, kanselyariya
    MARKETING,      // Reklama
    TAX,            // Soliq va yig'imlar
    MAINTENANCE,    // Ta'mirlash, uskuna xizmati
    BANK_FEE,       // Bank va ekvayring komissiyasi
    OTHER           // Boshqa
}
