package uz.shinamagazin.api.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Audit uchun entity'ning DASTLABKI holatini saqlaydigan, TRANZAKSIYA DOIRASIDAGI kontekst.
 *
 * <p>Ilgari bu {@code AuditEntityListener} ichidagi {@code static ConcurrentHashMap} edi.
 * U ikkita jiddiy muammoga olib kelardi:
 *
 * <ol>
 *   <li><b>Xotira sizishi.</b> Yozuv har {@code @PostLoad}da qo'shilib, faqat
 *       {@code @PreUpdate}/{@code @PreRemove}da o'chirilardi. O'qilgan-u yozilmagan
 *       har bir entity — mahsulot ro'yxati, hisobot, 10 000 qatorlik eksport —
 *       xaritada ABADIY qolardi. TTL ham, chegara ham yo'q edi.</li>
 *   <li><b>Audit yozuvining yo'qolishi.</b> Xarita global va faqat {@code class:id}
 *       bo'yicha kalitlangan edi. Ikki so'rov bir entity'ni bir vaqtda yangilasa,
 *       {@code remove()} poygasida yutqazgani {@code null} olib, o'zgarishni
 *       AUDITSIZ o'tkazib yuborardi.</li>
 * </ol>
 *
 * <p>Yechim: holat {@link ThreadLocal}da saqlanadi (JPA lifecycle callback'lari
 * tranzaksiya bilan bir xil oqimda ishlaydi), tranzaksiya tugagach esa
 * {@link TransactionSynchronization#afterCompletion} orqali avtomatik tozalanadi.
 * Shunday qilib yozuvlar oqimlar orasida aralashmaydi va hech qachon
 * tranzaksiyadan uzoq yashamaydi.
 *
 * <p>Qo'shimcha himoya: {@code AuditCorrelationInterceptor.afterCompletion} ham
 * tozalaydi — tranzaksiyasiz o'qishlar (masalan {@code open-in-view} ostidagi
 * lazy yuklashlar) uchun.
 */
@Slf4j
public final class AuditStateContext {

    /**
     * Bitta tranzaksiyada saqlanadigan maksimal dastlabki-holat soni.
     *
     * <p>Chegara kerak: 10 000 qatorlik eksport har bir qator uchun
     * {@code toAuditMap()} yaratardi. Endi bu tranzaksiya oxirida bo'shatilsa-da,
     * bir so'rov ichida ham heap'ni to'ldirmasligi kerak. Eksport hech nimani
     * YANGILAMAGANI uchun chegaradan oshgan yozuvlarni saqlamaslik xavfsiz.
     */
    private static final int MAX_ENTRIES = 5_000;

    private static final ThreadLocal<State> STATE = new ThreadLocal<>();

    private AuditStateContext() {
        // Utility class
    }

    /** Oqimga bog'langan holat. */
    private static final class State {
        final Map<String, Map<String, Object>> entries = new HashMap<>();
        boolean capWarned;
    }

    /**
     * Entity'ning dastlabki holatini saqlaydi. Birinchi chaqiruvda tranzaksiya
     * tugashiga tozalash ro'yxatdan o'tkaziladi.
     */
    public static void put(String key, Map<String, Object> originalState) {
        State state = STATE.get();
        if (state == null) {
            state = new State();
            STATE.set(state);
            registerCleanup();
        }

        if (state.entries.size() >= MAX_ENTRIES) {
            if (!state.capWarned) {
                state.capWarned = true;
                log.warn("Audit dastlabki-holat chegarasi ({}) bitta tranzaksiyada oshib ketdi — "
                        + "keyingi yozuvlar saqlanmaydi. Ko'p qatorli o'qish (eksport/hisobot) "
                        + "bo'lsa bu normal; yangilash amali bo'lsa audit yozuvi tushmay qolishi mumkin.",
                        MAX_ENTRIES);
            }
            return;
        }

        state.entries.put(key, originalState);
    }

    /**
     * Dastlabki holatni qaytaradi (topilmasa null).
     *
     * <p>DIQQAT: bu yerda ataylab {@code remove()} EMAS. Ilgari o'qib-o'chirish
     * ishlatilardi, natijada bitta tranzaksiyada entity ikki marta yangilansa
     * ikkinchisi baseline'siz qolib, audit yozuvi jimgina tushmay qolardi.
     * Tozalashni tranzaksiya oxiri bajaradi.
     */
    public static Map<String, Object> get(String key) {
        State state = STATE.get();
        return state == null ? null : state.entries.get(key);
    }

    /** Bitta yozuvni olib tashlaydi (entity o'chirilganda). */
    public static void remove(String key) {
        State state = STATE.get();
        if (state != null) {
            state.entries.remove(key);
        }
    }

    /** Oqimdagi barcha holatni bo'shatadi. */
    public static void clear() {
        STATE.remove();
    }

    /** Diagnostika uchun: joriy oqimda saqlanayotgan yozuvlar soni. */
    public static int size() {
        State state = STATE.get();
        return state == null ? 0 : state.entries.size();
    }

    private static void registerCleanup() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // Tranzaksiyasiz o'qish — AuditCorrelationInterceptor tozalaydi.
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                clear();
            }
        });
    }
}
