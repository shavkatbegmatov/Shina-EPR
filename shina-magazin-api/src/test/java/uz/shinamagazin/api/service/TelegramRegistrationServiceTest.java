package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import uz.shinamagazin.api.dto.telegram.BotReply;
import uz.shinamagazin.api.dto.telegram.TelegramSender;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.security.SimpleRateLimiter;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Telegram orqali mijozning o'zi ro'yxatdan o'tishi.
 *
 * <p>Bu yerdagi eng muhim test — {@link #foreignContactIsRejected()}. Qolgani
 * qulaylik masalasi, u esa xavfsizlik: tekshiruvsiz istalgan odam BEGONA
 * raqamga akkaunt ochib, o'sha odamning xaridlari, buyurtmalari va
 * QARZLARINI o'qiy olardi.
 */
class TelegramRegistrationServiceTest {

    private static final long CHAT_ID = 555_000_111L;
    private static final long USER_ID = 777_222_333L;
    private static final String RAW_PHONE = "998901234567";
    private static final String NORMALIZED_PHONE = "+998901234567";

    private CustomerRepository customerRepository;
    private SettingsService settingsService;
    private StaffNotificationService staffNotificationService;
    private TelegramRegistrationService service;

    private final TelegramSender sender =
            new TelegramSender(USER_ID, "Alisher", "Karimov", "alisher");

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        settingsService = mock(SettingsService.class);
        staffNotificationService = mock(StaffNotificationService.class);

        when(settingsService.isTelegramRegistrationEnabled()).thenReturn(true);
        when(customerRepository.findByPhone(anyString())).thenReturn(Optional.empty());
        when(customerRepository.findByTelegramChatId(anyLong())).thenReturn(Optional.empty());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        service = new TelegramRegistrationService(
                customerRepository, fakeEncoder(), settingsService,
                staffNotificationService, new SimpleRateLimiter());
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://protektor.uz");
    }

    /**
     * Bcrypt ataylab sekin — har bir testda uni haqiqiy ishlatish to'plamni
     * sudrab yurardi. Bu yerda tekshirilayotgan narsa PIN qanday HASHLANISHI
     * emas, u umuman o'rnatiladimi va javobdagi bilan mos keladimi.
     */
    private static PasswordEncoder fakeEncoder() {
        return new PasswordEncoder() {
            @Override
            public String encode(CharSequence raw) {
                return "hashed:" + raw;
            }

            @Override
            public boolean matches(CharSequence raw, String encoded) {
                return encode(raw).equals(encoded);
            }
        };
    }

    // ─── Xavfsizlik ───

    /**
     * Telegramda foydalanuvchi o'z manzillar kitobidagi ISTALGAN kontaktni
     * yubora oladi. Bunday kontaktda {@code user_id} boshqa odamniki bo'ladi
     * (yoki umuman bo'lmaydi) — aynan shu farq raqam egaligini isbotlaydi.
     */
    @Test
    @DisplayName("Begona kontakt rad etiladi — mijoz yaratilmaydi")
    void foreignContactIsRejected() {
        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID + 1, RAW_PHONE);

        assertThat(reply.text()).contains("sizniki emas");
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("user_id'siz kontakt rad etiladi")
    void contactWithoutUserIdIsRejected() {
        BotReply reply = service.onContact(CHAT_ID, sender, null, RAW_PHONE);

        assertThat(reply.text()).contains("sizniki emas");
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bloklangan mijozga kirish berilmaydi")
    void inactiveCustomerIsRefused() {
        Customer blocked = existingCustomer();
        blocked.setActive(false);
        when(customerRepository.findByPhone(NORMALIZED_PHONE)).thenReturn(Optional.of(blocked));

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        assertThat(reply.text()).contains("faol emas");
        verify(customerRepository, never()).save(any());
    }

    /**
     * Operator raqamni qayta sotgan holat "yangi Telegram akkaunt" holatidan
     * farq qilmaydi. Bog'lanishni jimgina ko'chirish begona odamga oldingi
     * egasining qarzlarini ochib berardi — qaror xodimniki.
     */
    @Test
    @DisplayName("Boshqa Telegram akkauntga bog'langan raqam ko'chirilmaydi")
    void phoneLinkedToAnotherChatIsRefused() {
        Customer linked = existingCustomer();
        linked.setTelegramChatId(CHAT_ID + 999);
        when(customerRepository.findByPhone(NORMALIZED_PHONE)).thenReturn(Optional.of(linked));

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        assertThat(reply.text()).contains("boshqa Telegram akkauntga bog'langan");
        verify(customerRepository, never()).save(any());
    }

    /**
     * Teskari holat: CHAT boshqa mijozga bog'langan (foydalanuvchi raqamini
     * almashtirgan yoki xodim mijoz raqamini tahrirlagan). Ilgari bu holat
     * unique indeksga urilib JIMGINA yiqilardi — foydalanuvchi javobsiz
     * qolar, "Yangi PIN olish" tugmasi esa aynan shu oqimga taklif qilardi.
     */
    @Test
    @DisplayName("Boshqa mijozga bog'langan chat aniq javob oladi — jim crash emas")
    void chatLinkedToDifferentCustomerGetsExplicitReply() {
        Customer other = existingCustomer();
        other.setPhone("+998909999999");
        other.setTelegramChatId(CHAT_ID);
        when(customerRepository.findByTelegramChatId(CHAT_ID)).thenReturn(Optional.of(other));
        // kontakt raqami hech qanday mijozga tegishli emas (default: empty)

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        assertThat(reply.text()).contains("boshqa raqam bilan ro'yxatdan o'tgan");
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sozlama o'chiq bo'lsa ro'yxatdan o'tkazilmaydi")
    void disabledRegistrationCreatesNothing() {
        when(settingsService.isTelegramRegistrationEnabled()).thenReturn(false);

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        assertThat(reply.text()).contains("yopiq");
        verify(customerRepository, never()).save(any());
    }

    /**
     * Portal login validatsiyasi faqat {@code +998…} ni qabul qiladi. Boshqa
     * raqamni yozib qo'ysak, mijoz yozuvi paydo bo'lardi-yu, u hech qachon
     * kabinetga kira olmasdi.
     */
    @Test
    @DisplayName("O'zbekiston bo'lmagan raqam rad etiladi")
    void foreignPhoneIsRejected() {
        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, "+7 916 123 45 67");

        assertThat(reply.text()).contains("+998");
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ketma-ket urinishlar chegaralanadi")
    void repeatedAttemptsAreThrottled() {
        for (int i = 0; i < 5; i++) {
            service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);
        }

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        assertThat(reply.text()).contains("Juda ko'p urinish");
    }

    // ─── Muvaffaqiyatli ro'yxatdan o'tish ───

    @Test
    @DisplayName("Yangi mijoz yaratiladi va PIN beriladi")
    void registersNewCustomer() {
        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        Customer saved = captureSaved();
        assertThat(saved.getPhone()).isEqualTo(NORMALIZED_PHONE);
        assertThat(saved.getFullName()).isEqualTo("Alisher Karimov");
        assertThat(saved.getTelegramChatId()).isEqualTo(CHAT_ID);
        assertThat(saved.getTelegramUsername()).isEqualTo("alisher");
        assertThat(saved.getTelegramLinkedAt()).isNotNull();
        assertThat(saved.getPortalEnabled()).isTrue();
        assertThat(saved.getActive()).isTrue();
        // Yozuvni xodim emas, mijozning o'zi yaratdi
        assertThat(saved.getCreatedBy()).isNull();

        assertPinIsUsable(reply, saved);
        assertThat(reply.text()).contains("https://protektor.uz/kirish");
        verify(staffNotificationService).notifyNewCustomer(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Xodim kiritgan mavjud mijozga kabinet ochiladi")
    void linksExistingCustomer() {
        Customer existing = existingCustomer();
        existing.setPortalEnabled(false);
        when(customerRepository.findByPhone(NORMALIZED_PHONE)).thenReturn(Optional.of(existing));

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        Customer saved = captureSaved();
        assertThat(saved.getTelegramChatId()).isEqualTo(CHAT_ID);
        assertThat(saved.getPortalEnabled()).isTrue();
        // Xodim kiritgan to'liq ism Telegram taxallusi bilan almashtirilmaydi
        assertThat(saved.getFullName()).isEqualTo("Karimov Alisher Akmalovich");
        assertPinIsUsable(reply, saved);
        verify(staffNotificationService).notifyNewCustomer(anyString(), anyString(), any());
    }

    /**
     * PIN'ni unutgan mijoz uchun yagona o'zini-o'zi tiklash yo'li: kontaktni
     * qayta yuborish. Raqam egaligi Telegram orqali qayta tasdiqlanadi.
     */
    @Test
    @DisplayName("O'sha chatdan qayta yuborilsa yangi PIN beriladi")
    void reissuesPinForSameChat() {
        Customer linked = existingCustomer();
        linked.setTelegramChatId(CHAT_ID);
        linked.setPinAttempts(4);
        linked.setPinLockedUntil(java.time.LocalDateTime.now().plusMinutes(30));
        when(customerRepository.findByPhone(NORMALIZED_PHONE)).thenReturn(Optional.of(linked));

        BotReply reply = service.onContact(CHAT_ID, sender, USER_ID, RAW_PHONE);

        Customer saved = captureSaved();
        assertPinIsUsable(reply, saved);
        // Egalik qayta tasdiqlandi — bu PIN terib topishga urinish emas
        assertThat(saved.getPinAttempts()).isZero();
        assertThat(saved.getPinLockedUntil()).isNull();
        // Bog'lanish yangi emas — xodimni ikkinchi marta bezovta qilmaymiz
        verify(staffNotificationService, never()).notifyNewCustomer(anyString(), anyString(), any());
    }

    // ─── /start ───

    @Test
    @DisplayName("/start kontakt so'raydi")
    void startAsksForContact() {
        when(customerRepository.findByTelegramChatId(anyLong())).thenReturn(Optional.empty());

        BotReply reply = service.onStart(CHAT_ID);

        assertThat(reply.replyMarkup()).isNotNull();
        assertThat(reply.replyMarkup().toString()).contains("request_contact");
    }

    @Test
    @DisplayName("Sozlama o'chiq bo'lsa /start kontakt so'ramaydi")
    void startWhenDisabledOffersNothing() {
        when(settingsService.isTelegramRegistrationEnabled()).thenReturn(false);

        BotReply reply = service.onStart(CHAT_ID);

        assertThat(reply.text()).contains("yopiq");
        assertThat(reply.replyMarkup()).isNull();
    }

    // ─── Yordamchilar ───

    private Customer existingCustomer() {
        return Customer.builder()
                .fullName("Karimov Alisher Akmalovich")
                .phone(NORMALIZED_PHONE)
                .active(true)
                .portalEnabled(false)
                .build();
    }

    private Customer captureSaved() {
        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        return captor.getValue();
    }

    /**
     * Xabardagi PIN aynan saqlangan hash'ga mos kelishini tekshiradi.
     *
     * <p>Bu ikki xil xatoni ushlaydi: xabarga boshqa qiymat tushishi va
     * PIN'ning umuman saqlanmasligi — ikkalasida ham mijoz kabinetga kira
     * olmasdi, lekin bot "hammasi joyida" degan xabar berardi.
     */
    private void assertPinIsUsable(BotReply reply, Customer saved) {
        java.util.regex.Matcher matcher =
                java.util.regex.Pattern.compile("<code>(\\d{6})</code>").matcher(reply.text());
        assertThat(matcher.find()).as("javobda 6 xonali PIN bo'lishi kerak").isTrue();

        assertThat(saved.getPinHash()).isEqualTo("hashed:" + matcher.group(1));
        assertThat(saved.getPinSetAt()).isNotNull();
    }
}
