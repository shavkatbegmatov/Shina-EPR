package uz.shinamagazin.api.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationApproveRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationSubmitRequest;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.event.StaffDecisionNotificationEvent;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.EmployeeRepository;
import uz.shinamagazin.api.repository.StaffRegistrationRequestRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Xodimlikka ro'yxatdan o'tish so'rovlari.
 *
 * <p>Eng muhim tekshiruv — {@link #requestedRoleIsOnlyASuggestion()}. Forma
 * OMMAVIY, ya'ni istalgan odam o'ziga ADMIN so'rab yubora oladi. Agar
 * tasdiqlashda o'sha qiymat so'zsiz qabul qilinsa, e'tiborsiz bosilgan bitta
 * tugma to'liq huquqli akkaunt ochib qo'yardi.
 */
class StaffRegistrationServiceTest {

    private static final String PHONE = "+998901234567";

    private StaffRegistrationRequestRepository requestRepository;
    private EmployeeRepository employeeRepository;
    private EmployeeService employeeService;
    private StaffNotificationService staffNotificationService;
    private SettingsService settingsService;
    private TelegramApiClient telegramApiClient;
    private org.springframework.context.ApplicationEventPublisher eventPublisher;
    private StaffRegistrationService service;

    @BeforeEach
    void setUp() {
        requestRepository = mock(StaffRegistrationRequestRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        employeeService = mock(EmployeeService.class);
        staffNotificationService = mock(StaffNotificationService.class);
        UserRepository userRepository = mock(UserRepository.class);

        settingsService = mock(SettingsService.class);
        telegramApiClient = mock(TelegramApiClient.class);
        when(settingsService.getTelegramBotUsername()).thenReturn("protektor_uz_bot");

        // Qaror xabari endi hodisa orqali (AFTER_COMMIT) ketadi — test uni
        // eventPublisher chaqiruvi bo'yicha tekshiradi
        eventPublisher = mock(org.springframework.context.ApplicationEventPublisher.class);
        service = new StaffRegistrationService(
                requestRepository, employeeRepository, userRepository,
                employeeService, staffNotificationService, settingsService, telegramApiClient,
                eventPublisher);
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://protektor.uz");

        when(requestRepository.existsByPhoneAndStatus(anyString(), any())).thenReturn(false);
        when(employeeRepository.existsByPhone(anyString())).thenReturn(false);
        when(requestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Qaror qabul qilish JORIY foydalanuvchini yozadi ("kim tasdiqladi"),
        // shuning uchun testda ham autentifikatsiya konteksti kerak.
        CustomUserDetails principal = mock(CustomUserDetails.class);
        when(principal.getId()).thenReturn(1L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        when(userRepository.findById(1L)).thenReturn(Optional.of(new User()));
    }

    @AfterEach
    void tearDown() {
        // Kontekst ThreadLocal'da — tozalanmasa keyingi testlarga sizib o'tadi.
        SecurityContextHolder.clearContext();
    }

    // ─── Yuborish ───

    @Test
    @DisplayName("So'rov saqlanadi va xodimlarga bildirishnoma boradi")
    void submitSavesAndNotifies() {
        service.submit(submitRequest("SELLER"), "10.0.0.1");

        StaffRegistrationRequest saved = captureSaved();
        assertThat(saved.getPhone()).isEqualTo(PHONE);
        assertThat(saved.getStatus()).isEqualTo(StaffRegistrationStatus.PENDING);
        assertThat(saved.getClientIp()).isEqualTo("10.0.0.1");

        // Odam javob kutib turibdi — bu harakat talab qiladigan voqea
        verify(staffNotificationService).createGlobalNotification(
                anyString(), anyString(), eq(StaffNotificationType.WARNING),
                eq("STAFF_REGISTRATION"), any());
    }

    /**
     * Aks holda tugmani qayta-qayta bosgan odam navbatni bir xil so'rovlar
     * bilan to'ldirib yuborardi.
     */
    @Test
    @DisplayName("Kutilayotgan so'rov ustiga ikkinchisi qabul qilinmaydi")
    void duplicatePendingIsRejected() {
        when(requestRepository.existsByPhoneAndStatus(PHONE, StaffRegistrationStatus.PENDING))
                .thenReturn(true);

        assertThatThrownBy(() -> service.submit(submitRequest("SELLER"), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ko'rib chiqilmoqda");

        verify(requestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Allaqachon xodim bo'lgan raqam rad etiladi")
    void existingEmployeePhoneIsRejected() {
        when(employeeRepository.existsByPhone(PHONE)).thenReturn(true);

        assertThatThrownBy(() -> service.submit(submitRequest("SELLER"), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon xodim");

        verify(requestRepository, never()).save(any());
    }

    // ─── Tasdiqlash ───

    @Test
    @DisplayName("Tasdiqlashda so'ralgan rol emas, TANLANGAN rol qo'llanadi")
    void requestedRoleIsOnlyASuggestion() {
        StaffRegistrationRequest pending = pending("ADMIN");
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(employeeService.createEmployee(any())).thenReturn(employeeResponse());

        StaffRegistrationApproveRequest approve = new StaffRegistrationApproveRequest();
        approve.setRoleCode("SELLER");

        service.approve(1L, approve);

        ArgumentCaptor<EmployeeRequest> captor = ArgumentCaptor.forClass(EmployeeRequest.class);
        verify(employeeService).createEmployee(captor.capture());
        assertThat(captor.getValue().getRoleCode()).isEqualTo("SELLER");
    }

    /**
     * Rolni FAQAT tasdiqlovchi belgilaydi.
     *
     * <p>Ilgari tanlanmagan holatda arizadagi `requestedRole` ishlatilardi —
     * ochiq shakl esa ADMIN so'rashga ruxsat beradi. Ya'ni body'siz approve
     * (Swagger/curl/skript) arizachiga o'zi so'ragan huquqni berardi.
     * Endi tanlanmasa eng kam huquqli SELLER beriladi.
     */
    @Test
    @DisplayName("Rol tanlanmasa so'rovdagi rol EMAS, eng kam huquqli rol beriladi")
    void approveCreatesEmployeeWithAccount() {
        StaffRegistrationRequest pending = pending("MANAGER");
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(employeeService.createEmployee(any())).thenReturn(employeeResponse());
        when(employeeRepository.findById(anyLong())).thenReturn(Optional.empty());

        service.approve(1L, null);

        ArgumentCaptor<EmployeeRequest> captor = ArgumentCaptor.forClass(EmployeeRequest.class);
        verify(employeeService).createEmployee(captor.capture());
        EmployeeRequest created = captor.getValue();

        assertThat(created.getRoleCode())
                .as("arizachining o'z taklifi huquq bermaydi")
                .isEqualTo("SELLER");
        assertThat(created.getPhone()).isEqualTo(PHONE);
        // Akkauntsiz tasdiqlashning ma'nosi yo'q — odam kira olmasdi
        assertThat(created.getCreateUserAccount()).isTrue();
        assertThat(created.getHireDate()).isNotNull();
        assertThat(created.getPosition()).isNotBlank();

        assertThat(pending.getStatus()).isEqualTo(StaffRegistrationStatus.APPROVED);
        assertThat(pending.getReviewedAt()).isNotNull();
    }

    /**
     * Qaror xabarida login va VAQTINCHALIK PAROL ketadi — havolani oxirgi
     * ochgan odam kredensiallarni olib qolmasligi kerak. Mijoz oqimida ham
     * xuddi shunday guard bor.
     */
    @Test
    @DisplayName("Boshqa chatga bog'langan arizani qayta bog'lab bo'lmaydi")
    void linkTelegramRefusesRebindFromAnotherChat() {
        StaffRegistrationRequest pending = pending("SELLER");
        pending.setTelegramChatId(111L);
        when(requestRepository.findByTelegramLinkToken("tok")).thenReturn(Optional.of(pending));

        String reply = service.linkTelegram(222L, "tok");

        assertThat(reply).contains("boshqa Telegram hisobiga bog'langan");
        assertThat(pending.getTelegramChatId())
                .as("eski bog'lanish saqlanadi")
                .isEqualTo(111L);
        verify(requestRepository, never()).save(pending);
    }

    @Test
    @DisplayName("O'z chatidan qayta bog'lanish ishlayveradi")
    void linkTelegramFromSameChatStillWorks() {
        StaffRegistrationRequest pending = pending("SELLER");
        pending.setTelegramChatId(111L);
        when(requestRepository.findByTelegramLinkToken("tok")).thenReturn(Optional.of(pending));

        assertThat(service.linkTelegram(111L, "tok")).contains("kuzatuvda");
    }

    /**
     * Ikki xodim bir vaqtda tasdiqlashga urinsa, ikkinchisi to'xtashi kerak —
     * aks holda bitta odamga ikkita akkaunt ochilardi.
     */
    @Test
    @DisplayName("Ko'rib chiqilgan so'rov qayta tasdiqlanmaydi")
    void alreadyReviewedCannotBeApproved() {
        StaffRegistrationRequest done = pending("SELLER");
        done.setStatus(StaffRegistrationStatus.APPROVED);
        when(requestRepository.findById(1L)).thenReturn(Optional.of(done));

        assertThatThrownBy(() -> service.approve(1L, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon ko'rib chiqilgan");

        verify(employeeService, never()).createEmployee(any());
    }

    // ─── Rad etish ───

    @Test
    @DisplayName("Rad etilganda sabab saqlanadi, xodim yaratilmaydi")
    void rejectStoresReason() {
        StaffRegistrationRequest pending = pending("SELLER");
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));

        service.reject(1L, "  Bunday odam bizda ishlamaydi  ");

        assertThat(pending.getStatus()).isEqualTo(StaffRegistrationStatus.REJECTED);
        assertThat(pending.getRejectReason()).isEqualTo("Bunday odam bizda ishlamaydi");
        verify(employeeService, never()).createEmployee(any());
    }

    // ─── Telegram orqali xabar berish ───

    /**
     * Telegram botlari foydalanuvchiga birinchi bo'lib yozolmaydi, ya'ni
     * havolasiz arizachiga xabar yuborishning imkoni yo'q.
     */
    @Test
    @DisplayName("Ariza javobida Telegram havolasi qaytariladi")
    void submitReturnsTelegramLink() {
        var response = service.submit(submitRequest("SELLER"), null);

        StaffRegistrationRequest saved = captureSaved();
        assertThat(saved.getTelegramLinkToken()).isNotBlank();
        assertThat(response.getTelegramLinkUrl())
                .isEqualTo("https://t.me/protektor_uz_bot?start=staff_" + saved.getTelegramLinkToken());
    }

    @Test
    @DisplayName("Bot sozlanmagan bo'lsa havola bo'lmaydi, ariza baribir qabul qilinadi")
    void submitWithoutBotStillWorks() {
        when(settingsService.getTelegramBotUsername()).thenReturn("");

        var response = service.submit(submitRequest("SELLER"), null);

        assertThat(response.getTelegramLinkUrl()).isNull();
        verify(requestRepository).save(any());
    }

    @Test
    @DisplayName("/start staff_<token> arizani chatga bog'laydi")
    void linkTelegramBindsChat() {
        StaffRegistrationRequest pending = pending("SELLER");
        when(requestRepository.findByTelegramLinkToken("tok")).thenReturn(Optional.of(pending));

        String reply = service.linkTelegram(555L, "tok");

        assertThat(pending.getTelegramChatId()).isEqualTo(555L);
        assertThat(reply).contains("kuzatuvda");
    }

    /**
     * Notanish token — eski yoki qo'lda o'zgartirilgan havola. Xato o'rniga
     * null qaytariladi va chaqiruvchi odatdagi salomlashishga tushadi.
     */
    @Test
    @DisplayName("Notanish token null qaytaradi")
    void linkTelegramUnknownTokenReturnsNull() {
        when(requestRepository.findByTelegramLinkToken("yoq")).thenReturn(Optional.empty());

        assertThat(service.linkTelegram(555L, "yoq")).isNull();
    }

    @Test
    @DisplayName("Ko'rib chiqilgan arizaga bog'lanmaydi")
    void linkTelegramSkipsReviewed() {
        StaffRegistrationRequest done = pending("SELLER");
        done.setStatus(StaffRegistrationStatus.APPROVED);
        when(requestRepository.findByTelegramLinkToken("tok")).thenReturn(Optional.of(done));

        String reply = service.linkTelegram(555L, "tok");

        assertThat(done.getTelegramChatId()).isNull();
        assertThat(reply).contains("allaqachon ko'rib chiqilgan");
    }

    /**
     * Kredensiallar Telegramga yuboriladi (do'kon qaroriga ko'ra), lekin
     * xabar parolni almashtirish va xabarni o'chirish haqida ogohlantirishi
     * SHART — parol chat tarixida qolib ketmasin.
     */
    @Test
    @DisplayName("Tasdiqlash xabarida login, parol va ogohlantirish bo'ladi")
    void approveNotifiesWithCredentials() {
        StaffRegistrationRequest pending = pending("SELLER");
        pending.setTelegramChatId(555L);
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(employeeService.createEmployee(any())).thenReturn(employeeWithCredentials());

        service.approve(1L, null);

        // Xabar AFTER_COMMIT hodisasi orqali ketadi: commit'gacha yuborilsa,
        // rollback'da mavjud bo'lmagan akkauntning paroli yetkazilib bo'lardi
        StaffDecisionNotificationEvent event = capturedDecisionEvent();
        assertThat(event.chatId()).isEqualTo(555L);
        assertThat(event.text()).contains("a.karimov");
        assertThat(event.text()).contains("SirliParol123");
        assertThat(event.text()).contains("o'chirib tashlang");
    }

    @Test
    @DisplayName("Rad etish xabarida sabab bo'ladi")
    void rejectNotifiesWithReason() {
        StaffRegistrationRequest pending = pending("SELLER");
        pending.setTelegramChatId(555L);
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));

        service.reject(1L, "Bo'sh ish o'rni yo'q");

        StaffDecisionNotificationEvent event = capturedDecisionEvent();
        assertThat(event.chatId()).isEqualTo(555L);
        assertThat(event.text()).contains("rad etildi");
        assertThat(event.text()).contains("Bo'sh ish o'rni yo'q");
    }

    /** Qaror hodisasini ushlaydi (boshqa hodisalar ham nashr etiladi). */
    private StaffDecisionNotificationEvent capturedDecisionEvent() {
        ArgumentCaptor<Object> events = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(events.capture());
        return events.getAllValues().stream()
                .filter(StaffDecisionNotificationEvent.class::isInstance)
                .map(StaffDecisionNotificationEvent.class::cast)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Qaror hodisasi nashr etilmadi"));
    }

    @Test
    @DisplayName("Chat bog'lanmagan bo'lsa xabar yuborilmaydi")
    void noChatMeansNoMessage() {
        StaffRegistrationRequest pending = pending("SELLER");
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));

        service.reject(1L, "sabab");

        verify(eventPublisher, never()).publishEvent(any(StaffDecisionNotificationEvent.class));
    }

    // ─── Tozalash ───

    /**
     * Faqat RAD ETILGANLAR tozalanadi. Tasdiqlanganlar xodim yozuviga
     * bog'langan, kutilayotganlar esa orqasida javob kutayotgan haqiqiy
     * odam — ikkalasini ham o'chirib bo'lmaydi.
     */
    @Test
    @DisplayName("Tozalash faqat rad etilganlarga va 90 kundan eskisiga tegadi")
    void cleanupOnlyTouchesOldRejected() {
        when(requestRepository.deleteByStatusAndReviewedAtBefore(any(), any())).thenReturn(4);

        assertThat(service.cleanupRejected()).isEqualTo(4);

        ArgumentCaptor<StaffRegistrationStatus> status =
                ArgumentCaptor.forClass(StaffRegistrationStatus.class);
        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(requestRepository).deleteByStatusAndReviewedAtBefore(status.capture(), cutoff.capture());

        assertThat(status.getValue()).isEqualTo(StaffRegistrationStatus.REJECTED);
        // Chegara ~90 kun oldin (test bajarilish vaqtiga bir oz yo'l qo'yamiz)
        assertThat(cutoff.getValue()).isBetween(
                LocalDateTime.now().minusDays(90).minusMinutes(1),
                LocalDateTime.now().minusDays(90).plusMinutes(1));
    }

    // ─── Yordamchilar ───

    private static StaffRegistrationSubmitRequest submitRequest(String role) {
        StaffRegistrationSubmitRequest request = new StaffRegistrationSubmitRequest();
        request.setFullName("Alisher Karimov");
        request.setPhone(PHONE);
        request.setRequestedRole(role);
        return request;
    }

    private static StaffRegistrationRequest pending(String requestedRole) {
        return StaffRegistrationRequest.builder()
                .fullName("Alisher Karimov")
                .phone(PHONE)
                .requestedRole(requestedRole)
                .status(StaffRegistrationStatus.PENDING)
                .build();
    }

    private static EmployeeResponse employeeResponse() {
        EmployeeResponse response = new EmployeeResponse();
        response.setId(7L);
        return response;
    }

    private static EmployeeResponse employeeWithCredentials() {
        EmployeeResponse response = employeeResponse();
        response.setNewCredentials(uz.shinamagazin.api.dto.response.CredentialsInfo.builder()
                .username("a.karimov")
                .temporaryPassword("SirliParol123")
                .mustChangePassword(true)
                .build());
        return response;
    }

    private StaffRegistrationRequest captureSaved() {
        ArgumentCaptor<StaffRegistrationRequest> captor =
                ArgumentCaptor.forClass(StaffRegistrationRequest.class);
        verify(requestRepository).save(captor.capture());
        return captor.getValue();
    }
}
