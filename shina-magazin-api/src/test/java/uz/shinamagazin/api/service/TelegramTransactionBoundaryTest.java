package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.transaction.TestTransaction;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.repository.StaffNotificationRepository;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Telegram xabari TRANZAKSIYA TASDIQLANGANDAN KEYIN yuborilishi.
 *
 * <p>Bu eng jimgina buziladigan joy. "Kam zaxira" bildirishnomasi savdo
 * yaratish o'rtasida tug'iladi. Agar xabar darhol yuborilsa va savdo keyin
 * xatolik bilan qaytarilsa (masalan zaxira yetmagani aniqlansa), do'kon
 * egasiga hech qachon sodir bo'lmagan voqea haqida ogohlantirish ketadi —
 * va uni qaytarib olishning iloji yo'q.
 *
 * <p>Test `@TransactionalEventListener(AFTER_COMMIT)` ni qulflaydi: oddiy
 * `@EventListener` ga almashtirilsa yiqiladi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:telegram-tx;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({StaffNotificationService.class, TelegramNotificationListener.class})
class TelegramTransactionBoundaryTest {

    @Autowired private StaffNotificationService notificationService;
    @Autowired private StaffNotificationRepository notificationRepository;

    @MockitoBean private NotificationDispatcher notificationDispatcher;
    @MockitoBean private TelegramNotifier telegramNotifier;
    @MockitoBean private SettingsService settingsService;

    @BeforeEach
    void setUp() {
        when(settingsService.getTelegramEventTypes())
                .thenReturn(EnumSet.of(StaffNotificationType.ORDER, StaffNotificationType.WARNING));
    }

    @Test
    @DisplayName("Tranzaksiya tasdiqlangach xabar yuboriladi")
    void sendsAfterCommit() {
        createNotification();

        // Hali tasdiqlanmagan — xabar ketmasligi kerak
        verify(telegramNotifier, never()).send(anyString());

        TestTransaction.flagForCommit();
        TestTransaction.end();

        verify(telegramNotifier, timeout(2000)).send(anyString());
    }

    // Aynan shu holat uchun `AFTER_COMMIT` tanlangan.
    @Test
    @DisplayName("Tranzaksiya qaytarilsa xabar YUBORILMAYDI")
    void doesNotSendAfterRollback() {
        createNotification();

        TestTransaction.flagForRollback();
        TestTransaction.end();

        verify(telegramNotifier, after(300).never()).send(anyString());
        assertThat(notificationRepository.count())
                .as("bildirishnoma ham qaytarilgan")
                .isZero();
    }

    private void createNotification() {
        notificationService.createGlobalNotification(
                "Kam zaxira ogohlantirishi",
                "Michelin Primacy 4 - Zaxirada faqat 2 ta qoldi",
                StaffNotificationType.WARNING,
                "PRODUCT",
                1L);
    }
}
