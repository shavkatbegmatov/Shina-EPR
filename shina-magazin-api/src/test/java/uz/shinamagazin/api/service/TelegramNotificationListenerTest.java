package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.event.StaffNotificationCreatedEvent;

import java.util.EnumSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Qaysi bildirishnoma Telegramga uzatiladi.
 *
 * <p>Bu tanlov shovqin bilan foydali xabar orasidagi chegara: hamma narsani
 * yuborish do'kon egasini xabarlarga ko'mib tashlaydi va u eng muhimini
 * o'tkazib yuboradi.
 */
class TelegramNotificationListenerTest {

    private TelegramNotifier notifier;
    private SettingsService settings;
    private TelegramNotificationListener listener;

    @BeforeEach
    void setUp() {
        notifier = mock(TelegramNotifier.class);
        settings = mock(SettingsService.class);
        listener = new TelegramNotificationListener(notifier, settings);
        allow(StaffNotificationType.ORDER, StaffNotificationType.WARNING);
    }

    @Test
    @DisplayName("Yoqilgan turdagi bildirishnoma uzatiladi")
    void forwardsEnabledType() {
        listener.onStaffNotification(event(StaffNotificationType.ORDER, "SHOP_ORDER"));

        verify(notifier).send(anyString());
    }

    @Test
    @DisplayName("Yoqilmagan tur uzatilmaydi")
    void skipsDisabledType() {
        listener.onStaffNotification(event(StaffNotificationType.CUSTOMER, "CUSTOMER"));

        verify(notifier, never()).send(anyString());
    }

    // Rejalashtiruvchi har bir qarz uchun alohida bildirishnoma yaratadi.
    // Ularni birma-bir yuborish 50 ta qarzi bor do'konga ertalab 50 ta xabar
    // degani — o'rniga bitta xulosa yuboriladi (DebtReminderScheduler).
    @Test
    @DisplayName("Qarz ogohlantirishi birma-bir uzatilmaydi (xulosa bilan yuboriladi)")
    void skipsPerDebtWarnings() {
        listener.onStaffNotification(event(StaffNotificationType.WARNING, "DEBT"));

        verify(notifier, never()).send(anyString());
    }

    @Test
    @DisplayName("Kam zaxira ogohlantirishi esa uzatiladi")
    void forwardsLowStockWarning() {
        listener.onStaffNotification(event(StaffNotificationType.WARNING, "PRODUCT"));

        verify(notifier).send(anyString());
    }

    @Test
    @DisplayName("Xabarda sarlavha va matn bo'ladi")
    void messageCarriesTitleAndBody() {
        listener.onStaffNotification(new StaffNotificationCreatedEvent(
                "Yangi do'kon buyurtmasi", "PR-12 — 1 800 000 so'm",
                StaffNotificationType.ORDER, "SHOP_ORDER"));

        ArgumentCaptor<String> sent = ArgumentCaptor.forClass(String.class);
        verify(notifier).send(sent.capture());
        assertThat(sent.getValue())
                .contains("Yangi do'kon buyurtmasi")
                .contains("PR-12 — 1 800 000 so'm");
    }

    // parse_mode=HTML ishlatiladi: mijoz nomidagi "<" belgisi qochirilmasa
    // Telegram butun xabarni RAD ETADI, ya'ni ogohlantirish yo'qoladi.
    @Test
    @DisplayName("HTML belgilari qochiriladi")
    void escapesHtml() {
        listener.onStaffNotification(new StaffNotificationCreatedEvent(
                "Yangi mijoz", "<script>alert(1)</script> & Co",
                StaffNotificationType.ORDER, "SALE"));

        ArgumentCaptor<String> sent = ArgumentCaptor.forClass(String.class);
        verify(notifier).send(sent.capture());
        assertThat(sent.getValue())
                .doesNotContain("<script>")
                .contains("&lt;script&gt;")
                .contains("&amp; Co");
    }

    @Test
    @DisplayName("Hech qanday tur yoqilmagan bo'lsa hech narsa yuborilmaydi")
    void noTypesEnabledSendsNothing() {
        when(settings.getTelegramEventTypes()).thenReturn(Set.of());

        listener.onStaffNotification(event(StaffNotificationType.ORDER, "SHOP_ORDER"));

        verify(notifier, never()).send(anyString());
    }

    // --- helpers ---

    private void allow(StaffNotificationType... types) {
        when(settings.getTelegramEventTypes()).thenReturn(EnumSet.copyOf(Set.of(types)));
    }

    private static StaffNotificationCreatedEvent event(StaffNotificationType type, String referenceType) {
        return new StaffNotificationCreatedEvent("Sarlavha", "Matn", type, referenceType);
    }
}
