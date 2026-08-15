package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationApproveRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationSubmitRequest;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.dto.response.StaffRegistrationResponse;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.EmployeeStatus;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.EmployeeRepository;
import uz.shinamagazin.api.repository.StaffRegistrationRequestRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.util.PhoneNumberUtils;

import uz.shinamagazin.api.dto.response.StaffRegistrationSubmitResponse;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Base64;

import static uz.shinamagazin.api.service.TelegramApiClient.escapeHtml;

/**
 * Xodimlikka ro'yxatdan o'tish so'rovlari.
 *
 * <p>Ilgari `/admin/register` sahifasi hech qayerga hech narsa yubormasdi —
 * forma to'ldirilar, "so'rov qabul qilindi" deb yozilar va shu bilan tugardi.
 * Endi so'rov saqlanadi, xodimlarga bildirishnoma boradi va tasdiqlangach
 * haqiqiy akkaunt yaratiladi.
 *
 * <p><b>Muhim chegara:</b> so'rovning o'zi HECH QANDAY huquq bermaydi. U
 * ommaviy endpointdan keladi, ya'ni uni istalgan odam yubora oladi. Rol va
 * akkaunt faqat xodim tasdiqlagandan keyin paydo bo'ladi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StaffRegistrationService {

    /** Lavozim ko'rsatilmasa rol nomidan olinadi. */
    private static final String DEFAULT_ROLE_CODE = "SELLER";

    /**
     * Rad etilgan ariza qancha saqlanadi (kun).
     *
     * <p>Darhol o'chirmaymiz: "bu odamni allaqachon rad etganmizmi?" degan
     * savol amalda tug'iladi. Abadiy ham saqlamaymiz — bu shaxsiy ma'lumot
     * (ism, telefon, IP) va endi hech qanday maqsadga xizmat qilmaydi.
     */
    private static final int REJECTED_RETENTION_DAYS = 90;

    /** `t.me/<bot>?start=staff_<token>` — ariza va chatni bog'lash uchun. */
    private static final String TELEGRAM_START_PREFIX = "staff_";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StaffRegistrationRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmployeeService employeeService;
    private final StaffNotificationService staffNotificationService;
    private final SettingsService settingsService;
    private final TelegramApiClient telegramApiClient;

    /** ERP manzili — arizachiga yuboriladigan "kirish" havolasi uchun. */
    @Value("${shop.public-base-url:http://localhost:5183}")
    private String publicBaseUrl;

    // ─── Ommaviy: so'rov yuborish ───

    /**
     * Yangi so'rovni qabul qiladi.
     *
     * @param clientIp suiiste'mol tekshiruvi uchun saqlanadi (javobda qaytmaydi)
     */
    @Transactional
    public StaffRegistrationSubmitResponse submit(StaffRegistrationSubmitRequest request, String clientIp) {
        String phone = PhoneNumberUtils.normalize(request.getPhone());

        // Bir raqamdan bir vaqtda bitta kutilayotgan so'rov. Bazada ham unique
        // partial index bor — bu tekshiruv foydalanuvchiga tushunarli xabar
        // berish uchun, index esa poyga holatiga qarshi.
        if (requestRepository.existsByPhoneAndStatus(phone, StaffRegistrationStatus.PENDING)) {
            throw new BadRequestException(
                    "Bu raqam bo'yicha so'rov allaqachon yuborilgan va ko'rib chiqilmoqda.");
        }

        // Allaqachon xodim bo'lgan odamga ikkinchi yozuv kerak emas — aks holda
        // xodimlar ro'yxatida dublikat paydo bo'lardi va tasdiqlash paytida
        // "telefon band" xatosi bilan yiqilardi.
        if (employeeRepository.existsByPhone(phone)) {
            throw new BadRequestException(
                    "Bu raqam allaqachon xodim sifatida ro'yxatdan o'tgan. Kirish uchun administratorga murojaat qiling.");
        }

        StaffRegistrationRequest saved = requestRepository.save(StaffRegistrationRequest.builder()
                .fullName(request.getFullName().trim())
                .phone(phone)
                .companyName(trimToNull(request.getCompanyName()))
                .requestedRole(request.getRequestedRole())
                .note(trimToNull(request.getNote()))
                .status(StaffRegistrationStatus.PENDING)
                .clientIp(clientIp)
                .telegramLinkToken(generateLinkToken())
                .build());

        log.info("Xodimlikka so'rov: {} ({}), rol: {}", saved.getFullName(), phone, saved.getRequestedRole());

        // WARNING ATAYLAB: bu HARAKAT talab qiladigan voqea — odam javob kutib
        // turibdi. Sozlamalarda sukut bo'yicha yoqilgan turlar ORDER va
        // WARNING, ya'ni bu xabar Telegramga ham yetib boradi. INFO tanlansa
        // ko'pchilikda o'chiq turgani uchun jimgina yo'qolardi.
        staffNotificationService.createGlobalNotification(
                "Xodimlikka so'rov",
                String.format("%s (%s) %s roli uchun so'rov yubordi",
                        saved.getFullName(), phone, saved.getRequestedRole()),
                StaffNotificationType.WARNING,
                "STAFF_REGISTRATION",
                saved.getId());

        return StaffRegistrationSubmitResponse.builder()
                .telegramLinkUrl(telegramLinkUrl(saved.getTelegramLinkToken()))
                .build();
    }

    /**
     * Botdagi `/start staff_<token>` — arizani shu chatga bog'laydi.
     *
     * <p>Telegram botlari foydalanuvchiga birinchi bo'lib yozolmaydi, ya'ni
     * qaror haqida xabar berishning YAGONA yo'li — arizachining o'zi shu
     * havolani ochishi.
     *
     * @return arizachiga ko'rsatiladigan javob, yoki token notanish bo'lsa {@code null}
     */
    @Transactional
    public String linkTelegram(long chatId, String token) {
        StaffRegistrationRequest request = requestRepository.findByTelegramLinkToken(token).orElse(null);
        if (request == null) {
            return null;
        }

        // Ko'rib chiqilgan arizaga bog'lanishning ma'nosi yo'q — qaror
        // allaqachon chiqqan va xabar yuborilmaydi.
        if (request.getStatus() != StaffRegistrationStatus.PENDING) {
            return "Bu ariza allaqachon ko'rib chiqilgan. Savollar bo'lsa do'kon bilan bog'laning.";
        }

        // Ariza BOSHQA chatga bog'langan bo'lsa qayta bog'lanmaydi: qaror
        // xabarida login va vaqtinchalik parol ketadi, ya'ni havolani oxirgi
        // ochgan odam kredensiallarni olib qolardi. Mijoz oqimida ham xuddi
        // shunday guard bor (TelegramRegistrationService.linkExisting).
        Long linkedChat = request.getTelegramChatId();
        if (linkedChat != null && !linkedChat.equals(chatId)) {
            log.warn("Xodimlik arizasi boshqa chatga bog'langan: {} (mavjud={}, yangi={})",
                    request.getPhone(), linkedChat, chatId);
            return "Bu ariza allaqachon boshqa Telegram hisobiga bog'langan. Do'kon bilan bog'laning.";
        }

        request.setTelegramChatId(chatId);
        requestRepository.save(request);
        log.info("Xodimlik arizasi Telegramga bog'landi: {} (chat={})", request.getPhone(), chatId);

        return """
                ✅ Arizangiz kuzatuvda.

                <b>%s</b>, arizangiz ko'rib chiqilmoqda. Qaror chiqishi bilan \
                shu yerda xabar beramiz."""
                .formatted(escapeHtml(request.getFullName()));
    }

    // ─── Xodim uchun: ko'rish va qaror ───

    @Transactional(readOnly = true)
    public Page<StaffRegistrationResponse> list(StaffRegistrationStatus status, Pageable pageable) {
        Page<StaffRegistrationRequest> page = (status == null)
                ? requestRepository.findAllByOrderByCreatedAtDesc(pageable)
                : requestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return page.map(StaffRegistrationResponse::from);
    }

    /** Ko'rib chiqilmagan so'rovlar soni — menyudagi belgi uchun. */
    @Transactional(readOnly = true)
    public long pendingCount() {
        return requestRepository.countByStatus(StaffRegistrationStatus.PENDING);
    }

    /**
     * So'rovni tasdiqlaydi: xodim yozuvi va foydalanuvchi akkaunti yaratiladi.
     *
     * <p>Yaratish mavjud {@link EmployeeService#createEmployee} orqali —
     * username generatsiyasi, vaqtinchalik parol va "birinchi kirishda
     * parolni almashtirish" mantiqini takrorlamaslik uchun.
     *
     * @return xodim javobi; ichida BIR MARTALIK kredensiallar bo'ladi
     */
    @Transactional
    public EmployeeResponse approve(Long id, StaffRegistrationApproveRequest approveRequest) {
        StaffRegistrationRequest request = findPending(id);

        // Rolni FAQAT tasdiqlovchi belgilaydi. Arizadagi `requestedRole` —
        // ochiq shakldan kelgan TAKLIF (istalgan odam o'ziga ADMIN so'rab
        // yuborishi mumkin), shuning uchun u zaxira qiymat sifatida ham
        // ishlatilmaydi: tasdiqlovchi rolni ko'rsatmasa, eng kam huquqli
        // DEFAULT_ROLE_CODE beriladi.
        String roleCode = firstNonBlank(
                approveRequest != null ? approveRequest.getRoleCode() : null,
                DEFAULT_ROLE_CODE);

        EmployeeRequest employeeRequest = new EmployeeRequest();
        employeeRequest.setFullName(request.getFullName());
        employeeRequest.setPhone(request.getPhone());
        employeeRequest.setPosition(firstNonBlank(
                approveRequest != null ? approveRequest.getPosition() : null,
                positionForRole(roleCode)));
        employeeRequest.setHireDate(LocalDate.now());
        employeeRequest.setStatus(EmployeeStatus.ACTIVE);
        employeeRequest.setCreateUserAccount(true);
        employeeRequest.setRoleCode(roleCode);

        EmployeeResponse employee = employeeService.createEmployee(employeeRequest);

        request.setStatus(StaffRegistrationStatus.APPROVED);
        request.setReviewedBy(getCurrentUser());
        request.setReviewedAt(LocalDateTime.now());
        employeeRepository.findById(employee.getId()).ifPresent(request::setEmployee);
        requestRepository.save(request);

        log.info("Xodimlikka so'rov tasdiqlandi: {} ({}), rol: {}",
                request.getFullName(), request.getPhone(), roleCode);

        // Login VA vaqtinchalik parol yuboriladi — do'kon shunday qaror qildi:
        // parolni og'zaki yetkazish amalda noqulay.
        //
        // Bu parol chat tarixida qoladi (arizachining qurilmasida ham,
        // Telegram serverida ham). Ikki narsa xavfni cheklaydi: parol
        // VAQTINCHALIK va birinchi kirishda majburan almashtiriladi
        // (`mustChangePassword`), hamda xabarda uni o'chirish tavsiya etiladi.
        var credentials = employee.getNewCredentials();
        String username = credentials != null ? credentials.getUsername() : null;
        String password = credentials != null ? credentials.getTemporaryPassword() : null;

        notifyApplicant(request, """
                ✅ Arizangiz tasdiqlandi!

                Lavozim: <b>%s</b>
                Login: <b><code>%s</code></b>
                Vaqtinchalik parol: <b><code>%s</code></b>

                Kirish: %s/admin/login

                ⚠️ Birinchi kirishda parolni o'zgartirishingiz so'raladi. \
                Shundan keyin bu xabarni o'chirib tashlang."""
                .formatted(escapeHtml(employeeRequest.getPosition()),
                        escapeHtml(username == null ? "—" : username),
                        escapeHtml(password == null ? "—" : password),
                        publicBaseUrl()));

        return employee;
    }

    /** So'rovni rad etadi. Odam ma'lumotlarini to'g'rilab qayta yubora oladi. */
    @Transactional
    public StaffRegistrationResponse reject(Long id, String reason) {
        StaffRegistrationRequest request = findPending(id);

        request.setStatus(StaffRegistrationStatus.REJECTED);
        request.setReviewedBy(getCurrentUser());
        request.setReviewedAt(LocalDateTime.now());
        request.setRejectReason(trimToNull(reason));
        requestRepository.save(request);

        log.info("Xodimlikka so'rov rad etildi: {} ({})", request.getFullName(), request.getPhone());

        String reasonLine = request.getRejectReason() == null ? ""
                : "\n\nSabab: " + escapeHtml(request.getRejectReason());
        notifyApplicant(request, """
                Arizangiz rad etildi.%s

                Savollaringiz bo'lsa do'kon bilan bog'laning."""
                .formatted(reasonLine));

        return StaffRegistrationResponse.from(request);
    }

    // ─── Tozalash ───

    /**
     * Eski RAD ETILGAN arizalarni o'chiradi.
     *
     * <p>Faqat rad etilganlar tozalanadi, va bu ataylab:
     * <ul>
     *   <li><b>APPROVED</b> qoladi — u xodim yozuviga bog'langan va "bu odam
     *       qayerdan paydo bo'ldi" degan savolga javob beradi;</li>
     *   <li><b>PENDING</b> qoladi — orqasida javob kutayotgan HAQIQIY odam
     *       bor. Uni jimgina o'chirish arizani yo'qotish bo'lardi; ko'rilmagan
     *       ariza menyudagi hisoblagichda turaveradi.</li>
     * </ul>
     *
     * @return o'chirilgan arizalar soni
     */
    @Transactional
    public int cleanupRejected() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(REJECTED_RETENTION_DAYS);
        int deleted = requestRepository.deleteByStatusAndReviewedAtBefore(
                StaffRegistrationStatus.REJECTED, cutoff);
        if (deleted > 0) {
            log.info("{} ta eski rad etilgan ariza tozalandi ({} kundan eski)",
                    deleted, REJECTED_RETENTION_DAYS);
        }
        return deleted;
    }

    // ─── Yordamchilar ───

    /**
     * So'rovni topadi va u HALI ko'rib chiqilmaganini tekshiradi.
     *
     * <p>Ikki xodim bir vaqtda tasdiqlashga urinsa, ikkinchisi shu yerda
     * to'xtaydi — aks holda bitta odamga ikkita akkaunt ochilardi.
     */
    private StaffRegistrationRequest findPending(Long id) {
        StaffRegistrationRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("So'rov", "id", id));

        if (request.getStatus() != StaffRegistrationStatus.PENDING) {
            throw new BadRequestException("Bu so'rov allaqachon ko'rib chiqilgan.");
        }
        return request;
    }

    /**
     * Arizachiga qaror haqida xabar beradi.
     *
     * <p>Hech qachon yiqilmaydi: Telegram ishlamasligi tasdiqlashni bekor
     * qilmasligi kerak — xodim allaqachon qaror qabul qilgan va akkaunt
     * yaratilgan. Xabar bormasa, u qo'lda bog'lanadi.
     */
    private void notifyApplicant(StaffRegistrationRequest request, String text) {
        Long chatId = request.getTelegramChatId();
        if (chatId == null) {
            return;
        }
        try {
            telegramApiClient.sendMessage(chatId, text, TelegramApiClient.removeKeyboard());
        } catch (Exception e) {
            log.warn("Arizachiga xabar yuborilmadi ({}): {}", request.getPhone(), e.getMessage());
        }
    }

    /** ERP manzili — botdagi "kirish" havolasi uchun. */
    private String publicBaseUrl() {
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    /** Havola: `https://t.me/<bot>?start=staff_<token>`. Bot sozlanmagan bo'lsa null. */
    private String telegramLinkUrl(String token) {
        String botUsername = settingsService.getTelegramBotUsername();
        if (botUsername.isBlank() || token == null) {
            return null;
        }
        return "https://t.me/" + botUsername + "?start=" + TELEGRAM_START_PREFIX + token;
    }

    /**
     * Tasodifiy token.
     *
     * <p>Ariza ID'si ishlatilmaydi: ketma-ket raqamlarni sinab chiqqan odam
     * begona arizaga o'z chatini bog'lab, boshqa odamning qarori va
     * login'ini o'qib olardi.
     */
    private static String generateLinkToken() {
        byte[] bytes = new byte[18];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String positionForRole(String roleCode) {
        return switch (roleCode) {
            case "ADMIN" -> "Administrator";
            case "MANAGER" -> "Menejer";
            default -> "Sotuvchi";
        };
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }
}
