package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import uz.shinamagazin.api.event.StaffNotificationBroadcastEvent;

/**
 * Xodimlar bildirishnomasini WebSocket orqali tarqatadi — Telegram kanali
 * bilan bir xil {@code AFTER_COMMIT} chegarasida (sabablari
 * {@link TelegramNotificationListener} da).
 */
@Component
@RequiredArgsConstructor
public class WebSocketNotificationListener {

    private final NotificationDispatcher notificationDispatcher;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onStaffNotification(StaffNotificationBroadcastEvent event) {
        if (event.targetUserId() != null) {
            notificationDispatcher.notifyStaff(event.targetUserId(), event.notification());
        } else {
            notificationDispatcher.notifyAllStaff(event.notification());
        }
    }
}
