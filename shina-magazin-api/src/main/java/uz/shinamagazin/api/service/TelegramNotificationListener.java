package uz.shinamagazin.api.service;

import uz.shinamagazin.api.util.TelegramText;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.event.StaffNotificationCreatedEvent;

/**
 * Xodimlar bildirishnomasini Telegramga uzatadi.
 *
 * <p>{@code AFTER_COMMIT} — tranzaksiya tasdiqlangandan keyin. Savdo yaratish
 * o'rtasida "kam zaxira" bildirishnomasi tug'iladi; agar savdo keyin xatolik
 * bilan qaytarilsa, Telegramga soxta ogohlantirish ketib bo'lgan bo'lardi va
 * uni qaytarib olishning iloji yo'q.
 *
 * <p>{@code fallbackExecution} — tranzaksiyasiz chaqiriqlarni ham qamrash
 * uchun: aks holda ular JIMGINA tushib qolardi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationListener {

    private final TelegramNotifier telegramNotifier;
    private final SettingsService settingsService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onStaffNotification(StaffNotificationCreatedEvent event) {
        if (!shouldForward(event)) {
            return;
        }
        telegramNotifier.send(format(event));
    }

    private boolean shouldForward(StaffNotificationCreatedEvent event) {
        if (!settingsService.getTelegramEventTypes().contains(event.type())) {
            return false;
        }

        // Qarz ogohlantirishlari ATAYLAB o'tkazilmaydi: rejalashtiruvchi har
        // bir qarz uchun alohida bildirishnoma yaratadi, ya'ni 50 ta qarzi bor
        // do'kon ertalab 50 ta Telegram xabari olardi. Ular o'rniga
        // DebtReminderScheduler bitta umumiy xulosa yuboradi.
        return !("DEBT".equals(event.referenceType())
                && event.type() == StaffNotificationType.WARNING);
    }

    private String format(StaffNotificationCreatedEvent event) {
        return "%s <b>%s</b>%n%s".formatted(icon(event.type()), escape(event.title()),
                escape(event.message()));
    }

    private static String icon(StaffNotificationType type) {
        return switch (type) {
            case ORDER -> "🛒";
            case PAYMENT -> "💰";
            case WARNING -> "⚠️";
            case CUSTOMER -> "👤";
            case SUCCESS -> "✅";
            default -> "ℹ️";
        };
    }

    /** HTML parse_mode ishlatilgani uchun mijoz nomi kabi matnlar qochiriladi. */
    static String escape(String text) {
        return TelegramText.escapeHtml(text);
    }
}
