package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.entity.LoginAttempt;
import uz.shinamagazin.api.repository.LoginAttemptRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.util.UserAgentParser;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lockout o'z-o'zini uzaytirmasligi.
 *
 * <p>Qulflangan paytdagi urinishlar ham (ACCOUNT_LOCKED sababi bilan) FAILED
 * deb yozilib, hisobga kirardi: blok har urinishda oldinga surilar, hujumchi
 * ~6 daqiqada 1 so'rov bilan istalgan hisobni ABADIY qulflab tura olardi —
 * egasi to'g'ri parol kiritsa ham. Blok endi faqat HAQIQIY parol
 * xatolaridan hisoblanadi va oxirgisidan 30 daqiqa o'tgach ochiladi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:lockout;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class LoginAttemptLockoutTest {

    @Autowired private LoginAttemptRepository loginAttemptRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private LoginAttemptService service;

    private static final String USERNAME = "admin";

    @BeforeEach
    void setUp() {
        loginAttemptRepository.deleteAll();
        userRepository.deleteAll();
        service = new LoginAttemptService(loginAttemptRepository, userRepository, new UserAgentParser());
    }

    @Test
    @DisplayName("5 ta haqiqiy parol xatosi hisobni qulflaydi")
    void fiveGenuineFailuresLockTheAccount() {
        genuineFailures(5, 1);

        assertThat(service.isAccountLocked(USERNAME)).isTrue();
    }

    @Test
    @DisplayName("Qulflangan paytdagi rad etilgan urinishlar hisobga kirmaydi")
    void lockRejectedAttemptsDoNotCountTowardLock() {
        genuineFailures(4, 1);
        lockRejectedAttempts(3);

        assertThat(service.isAccountLocked(USERNAME))
                .as("4 ta haqiqiy xato + 3 ta rad — chegara 5 ga yetmagan")
                .isFalse();
    }

    // Asosiy DoS ssenariysi: hujumchi har 6 daqiqada bitta so'rov yuboradi.
    // Ilgari har biri "yangi xato" bo'lib blokni cheksiz uzaytirardi.
    @Test
    @DisplayName("Blok oxirgi HAQIQIY xatodan 30 daqiqa o'tgach ochiladi — rad etilganlar uzaytirmaydi")
    void lockExpiresDespiteOngoingLockRejectedAttempts() {
        genuineFailures(5, 31); // hammasi 31+ daqiqa oldin
        lockRejectedAttempts(5); // qulf paytidagi urinishlar — hozirgina

        assertThat(service.isAccountLocked(USERNAME))
                .as("haqiqiy xatolar oynadan chiqib ketdi — hisob ochiq")
                .isFalse();
        assertThat(service.getRemainingLockoutTime(USERNAME)).isZero();
    }

    @Test
    @DisplayName("Qolgan vaqt ham faqat haqiqiy xatolardan hisoblanadi")
    void remainingTimeIgnoresLockRejectedAttempts() {
        genuineFailures(5, 20); // 20 daqiqa oldin
        lockRejectedAttempts(2);

        long remaining = service.getRemainingLockoutTime(USERNAME);
        assertThat(remaining)
                .as("eng eski haqiqiy xato + 30 daqiqa — taxminan 10 daqiqa qoldi")
                .isBetween(8L, 11L);
    }

    // --- helpers ---

    /** {@code minutesAgo} daqiqa oldin qilingan haqiqiy parol xatolari. */
    private void genuineFailures(int count, int minutesAgo) {
        for (int i = 0; i < count; i++) {
            saveAttempt(LoginAttempt.FailureReason.INVALID_PASSWORD, minutesAgo);
        }
    }

    /** Qulflangan hisobga urinishlar — parol tekshirilmagan, faqat rad etilgan. */
    private void lockRejectedAttempts(int count) {
        for (int i = 0; i < count; i++) {
            saveAttempt(LoginAttempt.FailureReason.ACCOUNT_LOCKED, 0);
        }
    }

    private void saveAttempt(LoginAttempt.FailureReason reason, int minutesAgo) {
        LoginAttempt attempt = loginAttemptRepository.saveAndFlush(LoginAttempt.builder()
                .username(USERNAME)
                .ipAddress("10.0.0.7")
                .status(LoginAttempt.LoginStatus.FAILED)
                .failureReason(reason)
                .build());
        // @CreatedDate auditing saqlashda ustidan yozadi — orqaga surish
        // to'g'ridan-to'g'ri UPDATE bilan qilinadi
        entityManager.createQuery(
                        "UPDATE LoginAttempt la SET la.createdAt = :ts WHERE la.id = :id")
                .setParameter("ts", LocalDateTime.now().minusMinutes(minutesAgo))
                .setParameter("id", attempt.getId())
                .executeUpdate();
        entityManager.clear();
    }
}
