package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import uz.shinamagazin.api.event.StaffDecisionNotificationEvent;

/**
 * Xodimlik arizasi bo'yicha qarorni arizachiga yetkazadi — boshqa tashqi
 * kanallar bilan bir xil {@code AFTER_COMMIT} chegarasida
 * ({@link TelegramNotificationListener} izohiga qarang).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaffDecisionNotificationListener {

    private final TelegramApiClient telegramApiClient;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDecision(StaffDecisionNotificationEvent event) {
        try {
            telegramApiClient.sendMessage(event.chatId(), event.text(),
                    TelegramApiClient.removeKeyboard());
        } catch (Exception e) {
            // Telegram ishlamasligi qarorni bekor qilmaydi — xodim qo'lda bog'lanadi
            log.warn("Arizachiga qaror xabari yuborilmadi (chat={}): {}", event.chatId(), e.getMessage());
        }
    }
}
