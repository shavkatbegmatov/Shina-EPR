package uz.shinamagazin.api.enums;

/**
 * Mahsulot atributi (xususiyati) qiymat turi.
 * SELECT / MULTI_SELECT — oldindan belgilangan variantlardan tanlanadi (filtrlar uchun ideal),
 * NUMBER — birlik (unit) bilan sonli qiymat, TEXT — erkin matn, BOOLEAN — ha/yo'q.
 */
public enum AttributeType {
    TEXT,
    NUMBER,
    SELECT,
    MULTI_SELECT,
    BOOLEAN
}
