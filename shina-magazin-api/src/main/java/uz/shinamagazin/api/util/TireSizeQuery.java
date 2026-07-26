package uz.shinamagazin.api.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Erkin matnli qidiruvdan shina o'lchamini ajratib oladi.
 *
 * <p>Mijoz katalogda odatda aynan o'lchamni yozadi: "205/55R16". Ilgari qidiruv
 * faqat nom/SKU/brend bo'yicha LIKE qilardi, ya'ni o'lcham mahsulot NOMIDA
 * bo'lmasa hech narsa topilmasdi — holbuki o'lcham alohida ustunlarda
 * (width/profile/diameter) saqlanadi.
 *
 * <p>Qo'llab-quvvatlanadigan yozuvlar:
 * <pre>
 *   205/55R16   205/55 R16   205/55-16   205/55/16   205 55 16
 *   205/55      (diametrsiz)
 *   R16         (faqat diametr)
 *   "michelin 205/55r16"  -> o'lcham + qolgan matn "michelin"
 * </pre>
 *
 * <p>Raqamlar oqilona diapazonda bo'lishi tekshiriladi, aks holda oddiy
 * qidiruvdagi tasodifiy sonlar (masalan "2024") o'lcham deb talqin qilinardi.
 */
public record TireSizeQuery(Integer width, Integer profile, Integer diameter, String remainingText) {

    // Bozorda uchraydigan real diapazonlar
    private static final int MIN_WIDTH = 125, MAX_WIDTH = 385;
    private static final int MIN_PROFILE = 20, MAX_PROFILE = 95;
    private static final int MIN_DIAMETER = 10, MAX_DIAMETER = 26;

    /** 205/55R16, 205/55 16, 205-55-16 — ajratgich sifatida / - yoki bo'sh joy. */
    private static final Pattern FULL = Pattern.compile(
            "(\\d{3})\\s*[/\\-\\s]\\s*(\\d{2})\\s*[/\\-\\s]?\\s*[rRзЗ]?\\s*(\\d{2})\\b");

    /** 205/55 — diametrsiz. */
    private static final Pattern WIDTH_PROFILE = Pattern.compile(
            "(\\d{3})\\s*[/\\-]\\s*(\\d{2})\\b");

    /** R16 / r16 — faqat diametr. */
    private static final Pattern DIAMETER_ONLY = Pattern.compile(
            "\\b[rRзЗ]\\s*(\\d{2})\\b");

    private static final TireSizeQuery NONE = new TireSizeQuery(null, null, null, null);

    /** O'lcham topilmasa barcha maydonlar null bo'lgan natija qaytadi. */
    public static TireSizeQuery parse(String query) {
        if (query == null || query.isBlank()) {
            return NONE;
        }
        String text = query.trim();

        Matcher full = FULL.matcher(text);
        while (full.find()) {
            Integer w = inRange(full.group(1), MIN_WIDTH, MAX_WIDTH);
            Integer p = inRange(full.group(2), MIN_PROFILE, MAX_PROFILE);
            Integer d = inRange(full.group(3), MIN_DIAMETER, MAX_DIAMETER);
            if (w != null && p != null && d != null) {
                return new TireSizeQuery(w, p, d, without(text, full.group()));
            }
        }

        Matcher wp = WIDTH_PROFILE.matcher(text);
        while (wp.find()) {
            Integer w = inRange(wp.group(1), MIN_WIDTH, MAX_WIDTH);
            Integer p = inRange(wp.group(2), MIN_PROFILE, MAX_PROFILE);
            if (w != null && p != null) {
                return new TireSizeQuery(w, p, null, without(text, wp.group()));
            }
        }

        Matcher d = DIAMETER_ONLY.matcher(text);
        while (d.find()) {
            Integer diameter = inRange(d.group(1), MIN_DIAMETER, MAX_DIAMETER);
            if (diameter != null) {
                return new TireSizeQuery(null, null, diameter, without(text, d.group()));
            }
        }

        return NONE;
    }

    /** Hech bo'lmasa bitta o'lcham bo'lagi topildimi. */
    public boolean hasAnySize() {
        return width != null || profile != null || diameter != null;
    }

    private static Integer inRange(String raw, int min, int max) {
        int value = Integer.parseInt(raw);
        return (value >= min && value <= max) ? value : null;
    }

    /** O'lcham bo'lagini olib tashlab, qolgan matnni qaytaradi (bo'sh bo'lsa null). */
    private static String without(String text, String matched) {
        String rest = text.replace(matched, " ").replaceAll("\\s+", " ").trim();
        return rest.isEmpty() ? null : rest;
    }
}
