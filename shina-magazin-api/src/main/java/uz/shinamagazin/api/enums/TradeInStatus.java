package uz.shinamagazin.api.enums;

/** Barter hujjatining holati. */
public enum TradeInStatus {
    /** Qabul qilingan, kassada kutmoqda — mijozning krediti. */
    NEW,
    /** Savdoda hisobga olingan ({@code sale_id} to'ldirilgan). */
    APPLIED,
    /** Bekor qilingan — eski shinalar mijozga qaytarilgan, ombor kirimi qaytarilgan. */
    CANCELLED
}
