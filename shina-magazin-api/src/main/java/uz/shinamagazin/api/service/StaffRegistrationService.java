package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    private final StaffRegistrationRequestRepository requestRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmployeeService employeeService;
    private final StaffNotificationService staffNotificationService;

    // ─── Ommaviy: so'rov yuborish ───

    /**
     * Yangi so'rovni qabul qiladi.
     *
     * @param clientIp suiiste'mol tekshiruvi uchun saqlanadi (javobda qaytmaydi)
     */
    @Transactional
    public void submit(StaffRegistrationSubmitRequest request, String clientIp) {
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

        // Rolni TASDIQLOVCHI belgilaydi. So'rovdagi qiymat faqat taklif:
        // istalgan odam o'ziga ADMIN so'rab yuborishi mumkin.
        String roleCode = firstNonBlank(
                approveRequest != null ? approveRequest.getRoleCode() : null,
                request.getRequestedRole(),
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
        return StaffRegistrationResponse.from(request);
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
