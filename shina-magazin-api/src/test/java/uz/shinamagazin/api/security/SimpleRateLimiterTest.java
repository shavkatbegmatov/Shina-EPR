package uz.shinamagazin.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Login throttle semantikasini qulflaydi.
 *
 * <p>Eng muhim xossa: FAQAT muvaffaqiyatsiz urinishlar hisoblanadi va
 * muvaffaqiyatli kirish byudjetni tozalaydi. Aks holda bitta ofis IP'si
 * ortidagi 10 xodimning normal kirishlari chegarani yeb, ish kunining
 * o'rtasida hammani bloklab qo'yardi.
 */
class SimpleRateLimiterTest {

    private static final int MAX = 3;
    private static final long WINDOW = 60_000;

    /**
     * Boshqariladigan soat: oynaning eskirishini real vaqtga bog'lamasdan
     * tekshirish uchun. `Thread.sleep` yoki nol uzunlikdagi oyna bilan test
     * bir xil millisekundda bajarilganda tasodifan yiqilardi.
     */
    private static final class FakeClockLimiter extends SimpleRateLimiter {
        private long millis = 1_000_000;

        @Override
        protected long now() {
            return millis;
        }

        void advance(long by) {
            millis += by;
        }
    }

    private FakeClockLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new FakeClockLimiter();
    }

    @Test
    @DisplayName("Yangi kalit bloklanmagan")
    void freshKeyIsNotBlocked() {
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isFalse();
    }

    @Test
    @DisplayName("Chegaraga yetgach bloklanadi")
    void blocksAfterReachingLimit() {
        for (int i = 0; i < MAX; i++) {
            assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW))
                    .as("%d-urinishdan oldin hali bloklanmasligi kerak", i + 1)
                    .isFalse();
            limiter.recordFailure("login:1.1.1.1", WINDOW);
        }

        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isTrue();
    }

    @Test
    @DisplayName("isBlocked hisoblagichni OSHIRMAYDI (tekshiruvning o'zi byudjet yemaydi)")
    void checkingDoesNotConsumeBudget() {
        limiter.recordFailure("login:1.1.1.1", WINDOW);

        for (int i = 0; i < 50; i++) {
            limiter.isBlocked("login:1.1.1.1", MAX, WINDOW);
        }

        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW))
                .as("faqat 1 ta xato qayd etilgan — 50 ta tekshiruv ta'sir qilmasligi kerak")
                .isFalse();
    }

    @Test
    @DisplayName("Muvaffaqiyatli kirish byudjetni tozalaydi")
    void successResetsBudget() {
        limiter.recordFailure("login:1.1.1.1", WINDOW);
        limiter.recordFailure("login:1.1.1.1", WINDOW);

        limiter.reset("login:1.1.1.1");

        for (int i = 0; i < MAX; i++) {
            assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isFalse();
            limiter.recordFailure("login:1.1.1.1", WINDOW);
        }
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isTrue();
    }

    @Test
    @DisplayName("Kalitlar bir-biriga ta'sir qilmaydi")
    void keysAreIndependent() {
        for (int i = 0; i < MAX; i++) {
            limiter.recordFailure("login:1.1.1.1", WINDOW);
        }

        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isTrue();
        assertThat(limiter.isBlocked("login:2.2.2.2", MAX, WINDOW)).isFalse();
    }

    @Test
    @DisplayName("Oyna o'tgach blok o'z-o'zidan tushadi")
    void blockExpiresWithWindow() {
        for (int i = 0; i < MAX; i++) {
            limiter.recordFailure("login:1.1.1.1", WINDOW);
        }
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW)).isTrue();

        limiter.advance(WINDOW - 1);
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW))
                .as("oyna hali tugamagan")
                .isTrue();

        limiter.advance(1);
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW))
                .as("oyna tugadi — blok tushishi kerak")
                .isFalse();
    }

    @Test
    @DisplayName("Oyna tugagach hisoblagich noldan boshlanadi")
    void counterRestartsAfterWindow() {
        for (int i = 0; i < MAX; i++) {
            limiter.recordFailure("login:1.1.1.1", WINDOW);
        }
        limiter.advance(WINDOW);

        limiter.recordFailure("login:1.1.1.1", WINDOW);
        assertThat(limiter.isBlocked("login:1.1.1.1", MAX, WINDOW))
                .as("yangi oynada bitta xato chegaraga yetmaydi")
                .isFalse();
    }

    @Test
    @DisplayName("Eskirgan yozuvlar tozalanadi — xarita cheksiz o'smaydi")
    void expiredEntriesAreEvicted() {
        // Kalit — mijoz IP'si, ya'ni tashqaridan boshqariladi. Tozalashsiz
        // xarita har yangi IP bilan o'sib borardi.
        for (int i = 0; i < 500; i++) {
            limiter.recordFailure("login:10.0.0." + i, WINDOW);
        }
        assertThat(limiter.trackedKeys()).isEqualTo(500);

        limiter.evictExpired();
        assertThat(limiter.trackedKeys())
                .as("yangi yozuvlar hali eskirmagan — saqlanishi kerak")
                .isEqualTo(500);
    }

    @Test
    @DisplayName("allow() eski xatti-harakatni saqlaydi (buyurtma endpointi)")
    void allowStillCountsEveryCall() {
        for (int i = 0; i < MAX; i++) {
            assertThat(limiter.allow("order:1.1.1.1", MAX, WINDOW)).isTrue();
        }
        assertThat(limiter.allow("order:1.1.1.1", MAX, WINDOW)).isFalse();
    }
}
