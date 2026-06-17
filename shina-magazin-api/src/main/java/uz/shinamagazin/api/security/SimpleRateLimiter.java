package uz.shinamagazin.api.security;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Oddiy in-memory rate limiter (fixed window). Ommaviy endpointlarda
 * (guest checkout) abuse/spam'ga qarshi birinchi himoya.
 *
 * ⚠️ Faqat bitta instansiya uchun (in-memory). Bir nechta instansiya yoki
 * qattiqroq himoya kerak bo'lsa — Redis/bucket4j yoki reverse-proxy darajasi.
 */
@Component
public class SimpleRateLimiter {

    private static final int MAX_REQUESTS = 10;     // bir oynada
    private static final long WINDOW_MS = 60_000;    // 1 daqiqa

    // key -> [windowStartMs, count]
    private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();

    /** true = ruxsat; false = limit oshib ketdi. */
    public boolean allow(String key) {
        long now = System.currentTimeMillis();
        long[] w = windows.compute(key, (k, v) -> {
            if (v == null || now - v[0] > WINDOW_MS) {
                return new long[]{now, 1};
            }
            v[1]++;
            return v;
        });
        return w[1] <= MAX_REQUESTS;
    }
}
