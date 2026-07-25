package uz.shinamagazin.api.service.export;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import uz.shinamagazin.api.exception.BadRequestException;

/**
 * Eksport endpointlari uchun umumiy qorovullar.
 *
 * <p><b>Muammo.</b> 13 ta eksport endpointi {@code @RequestParam(defaultValue =
 * "10000") int maxRecords} qabul qilib, uni to'g'ridan-to'g'ri
 * {@code PageRequest.of(0, maxRecords)} ga uzatardi. Yuqori chegara YO'Q edi,
 * ya'ni {@code ?maxRecords=100000000} butun jadvalni bitta {@code List}ga
 * yuklab, so'ng undan Excel/PDF ni XOTIRADA qurardi. Bitta so'rov butun
 * ilovani OOM bilan yiqita olardi — va bu endpointlar autentifikatsiyalangan
 * har qanday xodimga ochiq.
 *
 * <p>Manfiy yoki nol qiymat ham muammo edi: {@code PageRequest.of(0, 0)}
 * {@code IllegalArgumentException} tashlaydi, ya'ni oddiy xato 500 ga aylanardi.
 *
 * <p><b>Ikkinchi muammo — jim qisqartirish.</b> Default 10 000 bo'lgani uchun
 * undan katta jadval jimgina kesilardi: buxgalter "barcha savdolarni" eksport
 * qilib, hech qanday belgisiz to'liq bo'lmagan fayl olardi. Shuning uchun
 * {@link #truncationHeaders} kesilganini javob sarlavhalarida va logda bildiradi.
 */
@Slf4j
public final class ExportSupport {

    /**
     * Bitta eksportdagi maksimal qatorlar soni.
     *
     * <p>Excel/PDF butunlay xotirada quriladi (Apache POI + ByteArrayOutputStream),
     * shuning uchun chegara heap bilan bevosita bog'liq. 50 000 qator shina
     * do'koni uchun har qanday real hisobotdan ancha katta, lekin OOM
     * chegarasidan uzoq.
     */
    public static final int MAX_EXPORT_ROWS = 50_000;

    /** Kesilgan eksportni bildiruvchi sarlavhalar. */
    public static final String HEADER_TRUNCATED = "X-Export-Truncated";
    public static final String HEADER_RETURNED = "X-Export-Returned-Rows";
    public static final String HEADER_TOTAL = "X-Export-Total-Rows";

    private ExportSupport() {
        // Utility class
    }

    /**
     * Eksport uchun {@link Pageable} — chegaradan chiqqan qiymatni RAD ETADI.
     *
     * <p>Jimgina {@code MAX_EXPORT_ROWS} ga tushirish yomonroq bo'lardi:
     * foydalanuvchi 1 000 000 so'rab, 50 000 olib, hammasini oldim deb o'ylardi.
     * Aniq xato esa nima qilish kerakligini aytadi.
     *
     * @throws BadRequestException {@code maxRecords} 1..{@value #MAX_EXPORT_ROWS} oralig'ida bo'lmasa
     */
    public static Pageable pageable(int maxRecords) {
        return PageRequest.of(0, validate(maxRecords));
    }

    /** {@link #pageable(int)} ning saralashli varianti. */
    public static Pageable pageable(int maxRecords, Sort sort) {
        return PageRequest.of(0, validate(maxRecords), sort);
    }

    private static int validate(int maxRecords) {
        if (maxRecords < 1) {
            throw new BadRequestException("maxRecords kamida 1 bo'lishi kerak");
        }
        if (maxRecords > MAX_EXPORT_ROWS) {
            throw new BadRequestException(String.format(
                    "Bitta eksportda maksimal %,d qator mumkin (so'ralgan: %,d). "
                            + "Filtr qo'ying yoki davrni toraytiring.",
                    MAX_EXPORT_ROWS, maxRecords));
        }
        return maxRecords;
    }

    /**
     * Natija kesilgan bo'lsa buni bildiruvchi sarlavhalar.
     *
     * <p>Chegara ichida bo'lsa ham jadval undan katta bo'lishi mumkin (default
     * 10 000). Bunday holatda fayl to'liq emasligi mijozga ham, logga ham
     * bildiriladi — aks holda yetishmayotgan qatorlar sezilmay qolardi.
     */
    public static HttpHeaders truncationHeaders(Page<?> page, String exportName) {
        long returned = page.getNumberOfElements();
        long total = page.getTotalElements();
        boolean truncated = total > returned;

        HttpHeaders headers = new HttpHeaders();
        headers.add(HEADER_TRUNCATED, Boolean.toString(truncated));
        headers.add(HEADER_RETURNED, Long.toString(returned));
        headers.add(HEADER_TOTAL, Long.toString(total));

        if (truncated) {
            log.warn("Eksport '{}' KESILDI: {} qatordan {} tasi qaytarildi. "
                            + "To'liq eksport uchun maxRecords oshiring (maksimal {}) yoki filtr qo'ying.",
                    exportName, total, returned, MAX_EXPORT_ROWS);
        }
        return headers;
    }
}
