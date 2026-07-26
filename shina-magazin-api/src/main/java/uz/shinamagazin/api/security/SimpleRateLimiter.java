package uz.shinamagazin.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Oddiy in-memory rate limiter (fixed window). Ommaviy endpointlarda
 * (guest checkout, login) abuse/spam'ga qarshi birinchi himoya.
 *
 * <p>Ikki xil ishlatish rejimi bor:
 * <ul>
 *   <li>{@link #allow(String)} — har chaqiruvni hisoblaydi (buyurtma yaratish
 *       kabi "har so'rov qimmat" endpointlar uchun);</li>
 *   <li>{@link #isBlocked}/{@link #recordFailure}/{@link #reset} — faqat
 *       MUVAFFAQIYATSIZ urinishlarni hisoblaydi (login uchun). Bu farq muhim:
 *       bitta ofis IP'si ortida 10 xodim bo'lishi mumkin va ularning normal
 *       kirishlari byudjetni yemasligi kerak.</li>
 * </ul>
 *
 * ⚠️ Faqat bitta instansiya uchun (in-memory). Bir nechta instansiya yoki
 * qattiqroq himoya kerak bo'lsa — Redis/bucket4j yoki reverse-proxy darajasi.
 * Login uchun bu YAGONA himoya emas: `LoginAttemptService` foydalanuvchi nomi
 * bo'yicha DB'da doimiy qulflashni saqlaydi.
 */
@Component
@Slf4j
public class SimpleRateLimiter {

    private static final int MAX_REQUESTS = 10;     // bir oynada
    private static final long WINDOW_MS = 60_000;    // 1 daqiqa

    /**
     * Xaritadagi maksimal kalitlar soni.
     *
     * <p>Kalit — mijoz IP'si, ya'ni tashqaridan boshqariladi. Chegarasiz xarita
     * cheksiz o'sib ketardi: turli IP'lardan kelgan har bir so'rov abadiy
     * yozuv qoldirardi. Eskirgan yozuvlar rejaga muvofiq tozalanadi, bu esa
     * ikki tozalash orasidagi portlashga qarshi qo'shimcha chegara.
     */
    private static final int MAX_TRACKED_KEYS = 100_000;

    /** key -> [windowStartMs, count] */
    private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();

    /** true = ruxsat; false = limit oshib ketdi. Chaqiruvning O'ZI hisoblanadi. */
    public boolean allow(String key) {
        return allow(key, MAX_REQUESTS, WINDOW_MS);
    }

    /** {@link #allow(String)} ning sozlanadigan varianti. */
    public boolean allow(String key, int maxRequests, long windowMs) {
        if (windows.size() >= MAX_TRACKED_KEYS && !windows.containsKey(key)) {
            log.warn("Rate limiter xaritasi to'ldi ({} kalit) — yangi kalit qabul qilinmadi", MAX_TRACKED_KEYS);
            return false;
        }
        long now = now();
        long[] w = windows.compute(key, (k, v) -> {
            if (v == null || now - v[0] > windowMs) {
                return new long[]{now, 1};
            }
            v[1]++;
            return v;
        });
        return w[1] <= maxRequests;
    }

    /**
     * Kalit bloklanganmi — hisoblagichni OSHIRMAYDI.
     *
     * <p>Login uchun: urinishdan oldin tekshiriladi, keyin natijaga qarab
     * {@link #recordFailure} yoki {@link #reset} chaqiriladi.
     */
    public boolean isBlocked(String key, int maxFailures, long windowMs) {
        long[] w = windows.get(key);
        if (w == null) return false;
        if (now() - w[0] >= windowMs) return false;   // oyna eskirgan
        return w[1] >= maxFailures;
    }

    /**
     * Vaqt manbai. Testlar uni almashtira oladi — aks holda oynaning eskirishini
     * tekshirish real soatga bog'liq bo'lib, bir xil millisekundda bajarilganda
     * tasodifan yiqilardi.
     */
    protected long now() {
        return System.currentTimeMillis();
    }

    /** Muvaffaqiyatsiz urinishni qayd etadi. */
    public void recordFailure(String key, long windowMs) {
        if (windows.size() >= MAX_TRACKED_KEYS && !windows.containsKey(key)) {
            return; // xarita to'lgan — bloklash isBlocked orqali baribir ishlamaydi
        }
        long now = now();
        windows.compute(key, (k, v) -> {
            if (v == null || now - v[0] > windowMs) {
                return new long[]{now, 1};
            }
            v[1]++;
            return v;
        });
    }

    /** Muvaffaqiyatli amaldan keyin byudjetni tozalaydi. */
    public void reset(String key) {
        windows.remove(key);
    }

    /** Diagnostika uchun: kuzatilayotgan kalitlar soni. */
    public int trackedKeys() {
        return windows.size();
    }

    /**
     * Eskirgan oynalarni tozalaydi.
     *
     * <p>Eng uzun oyna (login: 15 daqiqa) dan kattaroq yoshdagi yozuvlar
     * o'chiriladi — ular endi hech qanday qarorga ta'sir qilmaydi.
     */
    @Scheduled(fixedDelay = 5 * 60_000)
    public void evictExpired() {
        long cutoff = now() - MAX_WINDOW_MS;
        int before = windows.size();
        windows.entrySet().removeIf(e -> e.getValue()[0] < cutoff);
        int removed = before - windows.size();
        if (removed > 0) {
            log.debug("Rate limiter: {} eskirgan yozuv tozalandi, {} qoldi", removed, windows.size());
        }
    }

    /** Tozalash uchun ishlatiladigan eng uzun oyna (login oynasidan kichik bo'lmasin). */
    private static final long MAX_WINDOW_MS = 30 * 60_000;
}
