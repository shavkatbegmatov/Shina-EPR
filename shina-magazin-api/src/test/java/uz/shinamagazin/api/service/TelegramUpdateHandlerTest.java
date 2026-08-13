package uz.shinamagazin.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import uz.shinamagazin.api.dto.telegram.BotReply;
import uz.shinamagazin.api.dto.telegram.TelegramSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Telegram JSON'ini amalga aylantirish.
 *
 * <p>Bu qatlam jimgina buziladigan joy: Telegram maydonlari ixtiyoriy
 * ({@code username}, {@code last_name}, {@code contact.user_id} ko'pincha
 * yo'q), noto'g'ri o'qilsa xatolik ham chiqmaydi — bot shunchaki javob
 * bermay qo'yadi.
 */
class TelegramUpdateHandlerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private TelegramRegistrationService registrationService;
    private StaffRegistrationService staffRegistrationService;
    private TelegramApiClient client;
    private TelegramUpdateHandler handler;

    @BeforeEach
    void setUp() {
        registrationService = mock(TelegramRegistrationService.class);
        staffRegistrationService = mock(StaffRegistrationService.class);
        client = mock(TelegramApiClient.class);
        handler = new TelegramUpdateHandler(registrationService, staffRegistrationService, client);

        when(registrationService.onStart(anyLong())).thenReturn(BotReply.of("salom"));
        when(registrationService.onUnknown(anyLong())).thenReturn(BotReply.of("yordam"));
        when(registrationService.onContact(anyLong(), any(), any(), any()))
                .thenReturn(BotReply.of("tayyor"));
    }

    @Test
    @DisplayName("/start ro'yxatdan o'tishni boshlaydi")
    void routesStart() {
        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"/start"}}"""));

        verify(registrationService).onStart(42L);
        verify(client).sendMessage(eq(42L), eq("salom"), isNull());
    }

    @Test
    @DisplayName("Kontakt maydonlari to'g'ri uzatiladi")
    void routesContact() {
        handler.handle(update("""
                {"message":{"chat":{"id":42},
                            "from":{"id":7,"first_name":"Ali","last_name":"Valiyev","username":"ali"},
                            "contact":{"user_id":7,"phone_number":"998901112233"}}}"""));

        ArgumentCaptor<TelegramSender> sender = ArgumentCaptor.forClass(TelegramSender.class);
        verify(registrationService).onContact(eq(42L), sender.capture(), eq(7L), eq("998901112233"));

        assertThat(sender.getValue().id()).isEqualTo(7L);
        assertThat(sender.getValue().fullName()).isEqualTo("Ali Valiyev");
        assertThat(sender.getValue().username()).isEqualTo("ali");
    }

    /**
     * Begona kontaktda {@code user_id} umuman bo'lmaydi. U {@code null} bo'lib
     * yetib borishi SHART — xizmat aynan shu bo'yicha rad etadi.
     */
    @Test
    @DisplayName("user_id'siz kontakt null bilan uzatiladi")
    void contactWithoutUserIdPassesNull() {
        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},
                            "contact":{"phone_number":"998901112233"}}}"""));

        verify(registrationService).onContact(eq(42L), any(), isNull(), eq("998901112233"));
    }

    /**
     * Xodimlik arizasi havolasi (`t.me/<bot>?start=staff_<token>`) — mijoz
     * ro'yxatidan BUTUNLAY boshqa oqim, u mijoz registratsiyasi o'chirilgan
     * bo'lsa ham ishlashi kerak.
     */
    @Test
    @DisplayName("/start staff_<token> xodimlik arizasiga yo'naltiriladi")
    void routesStaffLink() {
        when(staffRegistrationService.linkTelegram(42L, "abc123")).thenReturn("bog'landi");

        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"/start staff_abc123"}}"""));

        verify(staffRegistrationService).linkTelegram(42L, "abc123");
        verify(client).sendMessage(eq(42L), eq("bog'landi"), any());
        // Mijoz oqimi ishga tushmasligi kerak
        verify(registrationService, never()).onStart(anyLong());
    }

    @Test
    @DisplayName("Notanish token oddiy salomlashishga tushadi")
    void unknownStaffTokenFallsBackToStart() {
        when(staffRegistrationService.linkTelegram(anyLong(), anyString())).thenReturn(null);

        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"/start staff_eski"}}"""));

        verify(registrationService).onStart(42L);
    }

    @Test
    @DisplayName("Oddiy /start mijoz oqimida qoladi")
    void plainStartIsNotStaffFlow() {
        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"/start"}}"""));

        verify(staffRegistrationService, never()).linkTelegram(anyLong(), anyString());
        verify(registrationService).onStart(42L);
    }

    @Test
    @DisplayName("Boshqa matn yordam xabarini beradi")
    void routesUnknownText() {
        handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"salom"}}"""));

        verify(registrationService).onUnknown(42L);
    }

    @Test
    @DisplayName("message'siz yangilanish e'tiborsiz qoldiriladi")
    void ignoresNonMessageUpdate() {
        handler.handle(update("""
                {"update_id":1,"edited_message":{"chat":{"id":42}}}"""));

        verify(registrationService, never()).onStart(anyLong());
        verify(registrationService, never()).onUnknown(anyLong());
    }

    /**
     * Istisno chiqib ketsa: webhook'da Telegram xuddi shu yangilanishni
     * qayta-qayta yuborardi, polling'da esa butun sikl to'xtardi.
     */
    @Test
    @DisplayName("Xizmatdagi xatolik chaqiruvchiga chiqmaydi")
    void swallowsServiceFailure() {
        when(registrationService.onStart(anyLong())).thenThrow(new IllegalStateException("baza yiqildi"));

        assertThatCode(() -> handler.handle(update("""
                {"message":{"chat":{"id":42},"from":{"id":7,"first_name":"Ali"},"text":"/start"}}""")))
                .doesNotThrowAnyException();
    }

    private static JsonNode update(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
