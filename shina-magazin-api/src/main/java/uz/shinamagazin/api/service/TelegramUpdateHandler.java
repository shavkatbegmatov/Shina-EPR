package uz.shinamagazin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.dto.telegram.BotReply;
import uz.shinamagazin.api.dto.telegram.TelegramSender;

/**
 * Telegram yangilanishini ({@code Update}) tegishli amalga yo'naltiradi.
 *
 * <p>Bu qatlam TRANSPORTDAN mustaqil: webhook ham, polling ham xuddi shu
 * metodni chaqiradi. Ular orasidagi farq faqat yangilanish qanday YETIB
 * KELISHIDA.
 *
 * <p>Xabar yuborish shu yerda — {@link TelegramRegistrationService} faqat javob
 * matnini qaytaradi, tarmoqqa chiqmaydi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramUpdateHandler {

    private final TelegramRegistrationService registrationService;
    private final TelegramApiClient telegramApiClient;

    /**
     * Bitta yangilanishni qayta ishlaydi.
     *
     * <p>HECH QACHON istisno otmaydi: webhook'da tashlangan istisno Telegramga
     * xato javob qaytarardi va u xuddi shu yangilanishni qayta-qayta yuborib
     * turardi (retry sikli), polling'da esa oqim to'xtardi.
     */
    public void handle(JsonNode update) {
        try {
            JsonNode message = update.path("message");
            if (message.isMissingNode() || message.isNull()) {
                return; // boshqa turdagi yangilanish — bizga tegishli emas
            }

            long chatId = message.path("chat").path("id").asLong();
            if (chatId == 0) {
                return;
            }

            JsonNode fromNode = message.path("from");
            TelegramSender from = new TelegramSender(
                    fromNode.path("id").asLong(),
                    text(fromNode, "first_name"),
                    text(fromNode, "last_name"),
                    text(fromNode, "username"));

            BotReply reply = route(message, chatId, from);
            if (reply != null) {
                telegramApiClient.sendMessage(chatId, reply.text(), reply.replyMarkup());
            }
        } catch (Exception e) {
            log.error("Telegram yangilanishini qayta ishlashda xatolik", e);
        }
    }

    private BotReply route(JsonNode message, long chatId, TelegramSender from) {
        JsonNode contact = message.path("contact");
        if (contact.isObject()) {
            Long contactUserId = contact.hasNonNull("user_id") ? contact.get("user_id").asLong() : null;
            return registrationService.onContact(chatId, from, contactUserId, text(contact, "phone_number"));
        }

        String messageText = text(message, "text");
        if (messageText != null && messageText.startsWith("/start")) {
            return registrationService.onStart(chatId);
        }

        return registrationService.onUnknown(chatId);
    }

    private static String text(JsonNode node, String field) {
        return node.hasNonNull(field) ? node.get(field).asText() : null;
    }
}
