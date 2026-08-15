package uz.shinamagazin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import uz.shinamagazin.api.config.TelegramProperties;

import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Telegram Bot API'ning quyi darajali klienti (bot KIRISH kanali uchun).
 *
 * <p>{@link TelegramNotifier} ATAYLAB tegilmagan: u chiquvchi xabarnomalar
 * uchun ishlaydigan, testlar bilan qoplangan alohida yo'l. Bu yerda esa
 * botga kerak bo'lgan boshqa metodlar ({@code getUpdates}, klaviatura bilan
 * {@code sendMessage}, {@code setWebhook}) yig'ilgan.
 *
 * <p>Metodlar istisno OTMAYDI — Telegram ishlamay qolishi ilovani
 * to'xtatmasligi kerak. Muvaffaqiyatsizlik {@code false} yoki {@code null}
 * bilan bildiriladi.
 */
@Component
@Slf4j
public class TelegramApiClient {

    /** Telegram xabar chegarasi 4096 belgi. */
    private static final int MAX_MESSAGE_LENGTH = 4000;

    private final TelegramProperties props;

    /** Qisqa timeout: oddiy chaqiruvlar (sendMessage va h.k.). */
    private final RestClient restClient;

    /**
     * Uzoq timeout: {@code getUpdates} long-polling.
     *
     * <p>Read timeout {@code pollTimeoutSeconds} dan KATTA bo'lishi shart —
     * aks holda Telegram hali javob bermay turganda biz uzib yuborardik va
     * har bir so'rov timeout bilan tugardi.
     */
    private final RestClient pollClient;

    public TelegramApiClient(TelegramProperties props) {
        this.props = props;
        this.restClient = buildClient(Duration.ofSeconds(10));
        this.pollClient = buildClient(Duration.ofSeconds(props.getPollTimeoutSeconds() + 15L));
    }

    private static RestClient buildClient(Duration readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return props.getBotToken() != null && !props.getBotToken().isBlank();
    }

    /** Oddiy matnli xabar (klaviaturasiz). */
    public boolean sendMessage(long chatId, String text) {
        return sendMessage(chatId, text, null);
    }

    /**
     * Xabar yuborish, ixtiyoriy klaviatura bilan.
     *
     * @param replyMarkup {@code reply_markup} obyekti yoki {@code null}
     * @return yuborildimi
     */
    public boolean sendMessage(long chatId, String text, Map<String, Object> replyMarkup) {
        if (!isConfigured() || text == null || text.isBlank()) {
            return false;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", truncate(text));
        body.put("parse_mode", "HTML");
        body.put("disable_web_page_preview", true);
        if (replyMarkup != null) {
            body.put("reply_markup", replyMarkup);
        }

        return call("sendMessage", body) != null;
    }

    /**
     * Yangilanishlarni olish (long polling).
     *
     * @param offset qayta ishlangan oxirgi {@code update_id} + 1
     * @return {@code result} massivi; xatolikda bo'sh ro'yxat
     */
    public List<JsonNode> getUpdates(long offset) {
        if (!isConfigured()) {
            return List.of();
        }

        Map<String, Object> body = Map.of(
                "offset", offset,
                "timeout", props.getPollTimeoutSeconds(),
                // Faqat kerakli turlar: qolganlari (edited_message, channel_post…)
                // bu bot uchun shovqin va bekorga trafik.
                "allowed_updates", List.of("message"));

        JsonNode result = call(pollClient, "getUpdates", body);
        if (result == null || !result.isArray()) {
            return List.of();
        }

        List<JsonNode> updates = new java.util.ArrayList<>(result.size());
        result.forEach(updates::add);
        return updates;
    }

    /**
     * Webhook'ni ro'yxatdan o'tkazish.
     *
     * <p>{@code drop_pending_updates} — ilova uzoq o'chiq turgan bo'lsa,
     * yoqilishi bilan eski so'rovlar to'plamiga javob berib chiqmasin.
     */
    public boolean setWebhook(String url, String secretToken) {
        Map<String, Object> body = new HashMap<>();
        body.put("url", url);
        body.put("allowed_updates", List.of("message"));
        body.put("drop_pending_updates", true);
        if (secretToken != null && !secretToken.isBlank()) {
            body.put("secret_token", secretToken);
        }
        return call("setWebhook", body) != null;
    }

    /**
     * Webhook'ni o'chirish.
     *
     * <p>POLLING rejimida MAJBURIY: Telegram webhook o'rnatilgan bo'lsa
     * {@code getUpdates} ni umuman rad etadi (409 Conflict), ya'ni webhook'dan
     * polling'ga o'tgan deployment jimgina ishlamay qolardi.
     */
    public boolean deleteWebhook() {
        return call("deleteWebhook", Map.of("drop_pending_updates", false)) != null;
    }

    /** Bot username'ini aniqlash (sozlamalarni tekshirish uchun). */
    public String fetchBotUsername() {
        JsonNode me = call("getMe", Map.of());
        return me != null && me.hasNonNull("username") ? me.get("username").asText() : null;
    }

    /** Kontaktni ulashish tugmasi bo'lgan bir martalik klaviatura. */
    public static Map<String, Object> contactKeyboard(String buttonText) {
        Map<String, Object> button = new LinkedHashMap<>();
        button.put("text", buttonText);
        button.put("request_contact", true);

        Map<String, Object> markup = new LinkedHashMap<>();
        markup.put("keyboard", List.of(List.of(button)));
        markup.put("resize_keyboard", true);
        markup.put("one_time_keyboard", true);
        return markup;
    }

    /** Klaviaturani olib tashlash (ro'yxatdan o'tib bo'lgach kerak emas). */
    public static Map<String, Object> removeKeyboard() {
        return Map.of("remove_keyboard", true);
    }

    /**
     * {@code parse_mode=HTML} ishlatilgani uchun foydalanuvchi kiritgan matn
     * (ism, @username) qochiriladi.
     *
     * <p>Qochirilmasa Telegram butun xabarni rad etardi: ismida {@code <}
     * bo'lgan odam ro'yxatdan o'ta olmay, PIN'ini umuman ko'rmasdi.
     */
    public static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private JsonNode call(String method, Map<String, Object> body) {
        return call(restClient, method, body);
    }

    /**
     * Telegram metodini chaqiradi va {@code result} ni qaytaradi.
     *
     * @return natija, yoki xatolikda {@code null}
     */
    private JsonNode call(RestClient client, String method, Map<String, Object> body) {
        if (!isConfigured()) {
            return null;
        }
        try {
            JsonNode response = client.post()
                    .uri(props.getApiBase() + props.getBotToken() + "/" + method)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || !response.path("ok").asBoolean(false)) {
                log.warn("Telegram {} rad etdi: {}", method,
                        response == null ? "javob yo'q" : response.path("description").asText());
                return null;
            }
            return response.get("result");
        } catch (Exception e) {
            log.warn("Telegram {} chaqiruvi muvaffaqiyatsiz: {}", method, maskToken(e.getMessage()));
            return null;
        }
    }

    /**
     * Xato matnidan bot TOKENINI olib tashlaydi — u so'rov URL'ining yo'lida
     * turadi va Spring I/O xatolarida to'liq URI'ni xabar ichiga qo'shadi.
     * Tokenni bilgan odam botni to'liq egallaydi.
     */
    private String maskToken(String message) {
        String token = props.getBotToken();
        if (message == null || token == null || token.isBlank()) {
            return message;
        }
        return message.replace(token, "***");
    }

    private static String truncate(String text) {
        return text.length() <= MAX_MESSAGE_LENGTH
                ? text
                : text.substring(0, MAX_MESSAGE_LENGTH) + "…";
    }
}
