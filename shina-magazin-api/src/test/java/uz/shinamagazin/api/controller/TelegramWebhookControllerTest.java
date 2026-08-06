package uz.shinamagazin.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import uz.shinamagazin.api.config.TelegramProperties;
import uz.shinamagazin.api.service.TelegramUpdateHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Webhook himoyasi.
 *
 * <p>Bu endpoint {@code permitAll} — Telegram bizning JWT'imizni bilmaydi.
 * Ya'ni sir tekshiruvi YAGONA to'siq. U ishlamasa, manzilni topgan hujumchi
 * soxta "kontakt" yangilanishini yuborib, ISTALGAN raqamni o'zining chat
 * ID'siga bog'lay olardi — va yangi PIN o'sha chatga ketardi.
 */
class TelegramWebhookControllerTest {

    private static final String SECRET = "s3cret-token";

    private TelegramProperties props;
    private TelegramUpdateHandler handler;
    private TelegramWebhookController controller;
    private JsonNode update;

    @BeforeEach
    void setUp() throws Exception {
        props = new TelegramProperties();
        props.setMode(TelegramProperties.Mode.WEBHOOK);
        props.setWebhookSecret(SECRET);

        handler = mock(TelegramUpdateHandler.class);
        controller = new TelegramWebhookController(props, handler);
        update = new ObjectMapper().readTree("""
                {"update_id":1,"message":{"chat":{"id":1},"from":{"id":1},"text":"/start"}}""");
    }

    @Test
    @DisplayName("To'g'ri sir bilan yangilanish qabul qilinadi")
    void validSecretIsAccepted() {
        ResponseEntity<Void> response = controller.webhook(update, SECRET);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(handler).handle(any());
    }

    @Test
    @DisplayName("Noto'g'ri sir rad etiladi")
    void wrongSecretIsRejected() {
        ResponseEntity<Void> response = controller.webhook(update, "boshqa-sir");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(handler, never()).handle(any());
    }

    @Test
    @DisplayName("Sirsiz so'rov rad etiladi")
    void missingSecretIsRejected() {
        ResponseEntity<Void> response = controller.webhook(update, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(handler, never()).handle(any());
    }

    /**
     * Fail-closed: server sozlamasida sir bo'lmasa, kelgan so'rovdagi bo'sh sir
     * bilan "mos kelib" qolmasligi kerak.
     */
    @Test
    @DisplayName("Serverda sir yo'q bo'lsa hech narsa qabul qilinmaydi")
    void blankConfiguredSecretRejectsEverything() {
        props.setWebhookSecret("");

        assertThat(controller.webhook(update, "").getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(controller.webhook(update, SECRET).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(handler, never()).handle(any());
    }

    /**
     * Rejim webhook bo'lmaganda endpoint umuman "yo'q" — skanerlovchiga bu
     * yerda nima borligini aytmaymiz.
     */
    @Test
    @DisplayName("WEBHOOK rejimi yoqilmagan bo'lsa 404")
    void nonWebhookModeReturnsNotFound() {
        props.setMode(TelegramProperties.Mode.POLLING);

        ResponseEntity<Void> response = controller.webhook(update, SECRET);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(handler, never()).handle(any());
    }
}
