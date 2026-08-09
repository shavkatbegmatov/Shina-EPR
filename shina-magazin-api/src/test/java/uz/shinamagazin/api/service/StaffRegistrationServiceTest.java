package uz.shinamagazin.api.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationApproveRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationSubmitRequest;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.EmployeeRepository;
import uz.shinamagazin.api.repository.StaffRegistrationRequestRepository;
import uz.shinamagazin.api.repository.UserRepository;

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
    private StaffRegistrationService service;

    @BeforeEach
    void setUp() {
        requestRepository = mock(StaffRegistrationRequestRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        employeeService = mock(EmployeeService.class);
        staffNotificationService = mock(StaffNotificationService.class);
        UserRepository userRepository = mock(UserRepository.class);

        service = new StaffRegistrationService(
                requestRepository, employeeRepository, userRepository,
                employeeService, staffNotificationService);

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

    @Test
    @DisplayName("Tanlanmasa so'rovdagi rol ishlatiladi va xodim yaratiladi")
    void approveCreatesEmployeeWithAccount() {
        StaffRegistrationRequest pending = pending("MANAGER");
        when(requestRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(employeeService.createEmployee(any())).thenReturn(employeeResponse());
        when(employeeRepository.findById(anyLong())).thenReturn(Optional.empty());

        service.approve(1L, null);

        ArgumentCaptor<EmployeeRequest> captor = ArgumentCaptor.forClass(EmployeeRequest.class);
        verify(employeeService).createEmployee(captor.capture());
        EmployeeRequest created = captor.getValue();

        assertThat(created.getRoleCode()).isEqualTo("MANAGER");
        assertThat(created.getPhone()).isEqualTo(PHONE);
        // Akkauntsiz tasdiqlashning ma'nosi yo'q — odam kira olmasdi
        assertThat(created.getCreateUserAccount()).isTrue();
        assertThat(created.getHireDate()).isNotNull();
        assertThat(created.getPosition()).isNotBlank();

        assertThat(pending.getStatus()).isEqualTo(StaffRegistrationStatus.APPROVED);
        assertThat(pending.getReviewedAt()).isNotNull();
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

    private StaffRegistrationRequest captureSaved() {
        ArgumentCaptor<StaffRegistrationRequest> captor =
                ArgumentCaptor.forClass(StaffRegistrationRequest.class);
        verify(requestRepository).save(captor.capture());
        return captor.getValue();
    }
}
