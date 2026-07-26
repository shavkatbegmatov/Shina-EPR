package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.shinamagazin.api.dto.request.CustomerLoginRequest;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Mijoz login javobi telefon raqam ro'yxatdan o'tganini OSHKOR QILMASLIGINI
 * qulflaydi.
 *
 * <p>Ilgari metod oltita farqli xabar qaytarardi va faqat bittasi ("telefon
 * yoki PIN noto'g'ri") raqam topilmaganda chiqardi. Ya'ni javobning o'zi
 * "bu raqam do'kon mijozimi?" degan savolga aniq javob berardi — hujumchi
 * raqamlarni aylanib chiqib butun mijoz bazasini tiklashi va qaysi raqamga
 * 4 xonali PIN tanlashga arziydi, bilib olishi mumkin edi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CustomerAuthEnumerationTest {

    private static final String PHONE = "+998901112233";
    private static final String UNKNOWN_PHONE = "+998907776655";
    private static final String CORRECT_PIN = "1234";
    private static final String WRONG_PIN = "9999";

    @Mock private CustomerRepository customerRepository;
    @Mock private JwtTokenProvider tokenProvider;

    /** Haqiqiy bcrypt (past strength — test tez bo'lsin): matches() semantikasi shu testning mag'zi. */
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private CustomerAuthService service;

    @BeforeEach
    void setUp() {
        service = new CustomerAuthService(customerRepository, encoder, tokenProvider);
        when(customerRepository.findByPhone(UNKNOWN_PHONE)).thenReturn(Optional.empty());
    }

    // ─────────── Asosiy tasdiq: javoblar farqlanmaydi ───────────

    @Test
    @DisplayName("Noma'lum raqam va noto'g'ri PIN AYNAN bir xil xabar beradi")
    void unknownPhoneAndWrongPinAreIndistinguishable() {
        givenCustomer(activeCustomer());

        String unknownPhoneMessage = loginError(UNKNOWN_PHONE, CORRECT_PIN);
        String wrongPinMessage = loginError(PHONE, WRONG_PIN);

        assertThat(wrongPinMessage)
                .as("""
                        Ikki xabar farq qilsa, hujumchi raqam ro'yxatdan o'tganini
                        aniqlay oladi va butun mijoz bazasini tiklashi mumkin.""")
                .isEqualTo(unknownPhoneMessage);
    }

    @Test
    @DisplayName("Portal o'chirilgan akkaunt noto'g'ri PIN bilan o'zini oshkor qilmaydi")
    void portalDisabledDoesNotLeakOnWrongPin() {
        Customer customer = activeCustomer();
        customer.setPortalEnabled(false);
        givenCustomer(customer);

        assertThat(loginError(PHONE, WRONG_PIN)).isEqualTo(loginError(UNKNOWN_PHONE, WRONG_PIN));
    }

    @Test
    @DisplayName("PIN o'rnatilmagan akkaunt ham o'zini oshkor qilmaydi")
    void missingPinDoesNotLeak() {
        Customer customer = activeCustomer();
        customer.setPinHash(null);
        givenCustomer(customer);

        assertThat(loginError(PHONE, CORRECT_PIN)).isEqualTo(loginError(UNKNOWN_PHONE, CORRECT_PIN));
    }

    @Test
    @DisplayName("Faol bo'lmagan akkaunt noto'g'ri PIN bilan o'zini oshkor qilmaydi")
    void inactiveAccountDoesNotLeakOnWrongPin() {
        Customer customer = activeCustomer();
        customer.setActive(false);
        givenCustomer(customer);

        assertThat(loginError(PHONE, WRONG_PIN)).isEqualTo(loginError(UNKNOWN_PHONE, WRONG_PIN));
    }

    @Test
    @DisplayName("Umumiy xabar qolgan urinishlar sonini aytmaydi")
    void genericMessageDoesNotRevealAttemptCount() {
        Customer customer = activeCustomer();
        customer.setPinAttempts(3);
        givenCustomer(customer);

        assertThat(loginError(PHONE, WRONG_PIN))
                .as("aniq son akkaunt mavjudligini bildiradi")
                .doesNotContain("Qolgan urinishlar")
                .contains("bloklanadi");   // siyosat aytiladi, holat emas
    }

    // ─────────── PIN to'g'ri bo'lsa — aniq xabar foydali va xavfsiz ───────────

    @Test
    @DisplayName("PIN TO'G'RI bo'lsa portal o'chirilgani aytiladi (egasi uchun foydali)")
    void correctPinRevealsPortalDisabled() {
        Customer customer = activeCustomer();
        customer.setPortalEnabled(false);
        givenCustomer(customer);

        assertThat(loginError(PHONE, CORRECT_PIN)).contains("portal yoqilmagan");
    }

    @Test
    @DisplayName("PIN TO'G'RI bo'lsa qulf muddati aytiladi")
    void correctPinRevealsLockout() {
        Customer customer = activeCustomer();
        customer.setPinLockedUntil(LocalDateTime.now().plusMinutes(12));
        givenCustomer(customer);

        assertThat(loginError(PHONE, CORRECT_PIN)).contains("bloklangan");
    }

    @Test
    @DisplayName("Qulflangan akkauntga TO'G'RI PIN ham kirgizmaydi")
    void correctPinDoesNotBypassLockout() {
        Customer customer = activeCustomer();
        customer.setPinLockedUntil(LocalDateTime.now().plusMinutes(12));
        customer.setPinAttempts(MAX_ATTEMPTS);
        givenCustomer(customer);

        assertThatThrownBy(() -> service.login(loginRequest(PHONE, CORRECT_PIN)))
                .isInstanceOf(BadRequestException.class);

        assertThat(customer.getPinAttempts())
                .as("to'g'ri PIN qulfni ochmasligi va urinishlarni tozalamasligi kerak")
                .isEqualTo(MAX_ATTEMPTS);
        assertThat(customer.getPinLockedUntil()).isNotNull();
    }

    // ─────────── Urinishlarni sanash ───────────

    @Test
    @DisplayName("Noto'g'ri PIN haqiqiy akkaunt uchun urinish sifatida sanaladi")
    void wrongPinCountsAgainstRealAccount() {
        Customer customer = activeCustomer();
        givenCustomer(customer);

        loginError(PHONE, WRONG_PIN);

        assertThat(customer.getPinAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("Qulflangan akkauntda urinishlar oshmaydi (qulf adolatsiz uzaymasin)")
    void attemptsDoNotGrowWhileLocked() {
        Customer customer = activeCustomer();
        customer.setPinAttempts(MAX_ATTEMPTS);
        customer.setPinLockedUntil(LocalDateTime.now().plusMinutes(20));
        givenCustomer(customer);

        loginError(PHONE, WRONG_PIN);

        assertThat(customer.getPinAttempts()).isEqualTo(MAX_ATTEMPTS);
    }

    @Test
    @DisplayName("Mavjud bo'lmagan raqam uchun hech narsa saqlanmaydi")
    void unknownPhoneWritesNothing() {
        loginError(UNKNOWN_PHONE, WRONG_PIN);

        verify(customerRepository, never()).save(any());
    }

    // --- helpers ---

    private static final int MAX_ATTEMPTS = 5;

    private void givenCustomer(Customer customer) {
        when(customerRepository.findByPhone(PHONE)).thenReturn(Optional.of(customer));
    }

    private Customer activeCustomer() {
        Customer customer = Customer.builder()
                .fullName("Test Mijoz")
                .phone(PHONE)
                .portalEnabled(true)
                .active(true)
                .build();
        customer.setPinHash(encoder.encode(CORRECT_PIN));
        customer.setPinAttempts(0);
        return customer;
    }

    private static CustomerLoginRequest loginRequest(String phone, String pin) {
        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setPhone(phone);
        request.setPin(pin);
        return request;
    }

    private String loginError(String phone, String pin) {
        BadRequestException e = catchThrowableOfType(
                () -> service.login(loginRequest(phone, pin)), BadRequestException.class);
        assertThat(e).as("login xato berishi kutilgan edi").isNotNull();
        return e.getMessage();
    }
}
