package uz.shinamagazin.api.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.shinamagazin.api.dto.request.DebtPaymentRequest;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * Qarz to'lovi himoyalari.
 *
 * <p>Qaytarilgan yoki bekor qilingan sotuvning qarzi undirilmasligi kerak —
 * aks holda do'kon qaytarib olingan tovar uchun pul oladi va mijoz balansi
 * ikkinchi marta kreditlanadi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:debt-service;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DebtServiceTest {

    @Autowired private DebtRepository debtRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SaleRepository saleRepository;

    private DebtService service;
    private User cashier;
    private Customer buyer;

    @BeforeEach
    void setUp() {
        paymentRepository.deleteAll();
        debtRepository.deleteAll();
        saleRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        buyer = customerRepository.saveAndFlush(customer());

        service = new DebtService(debtRepository, paymentRepository, customerRepository,
                userRepository, mock(StaffNotificationService.class), mock(NotificationService.class));

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Bekor qilingan (CANCELLED) qarzga to'lov qabul qilinmaydi")
    void paymentOnCancelledDebtRejected() {
        Sale sale = sale(SaleStatus.REFUNDED, "1000000");
        Debt debt = debt(sale, "0", DebtStatus.CANCELLED);

        assertThatThrownBy(() -> service.makePayment(debt.getId(), payment("1000000")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bekor qilingan");
    }

    // Fix'dan OLDIN yaratilgan fantom qarzlar: sotuv qaytarilgan, lekin qarz
    // ACTIVE qolib ketgan. Ularni ham undirib bo'lmasligi kerak.
    @Test
    @DisplayName("Sotuvi REFUNDED bo'lgan eski fantom qarzga ham to'lov qabul qilinmaydi")
    void paymentOnPhantomDebtOfRefundedSaleRejected() {
        Sale sale = sale(SaleStatus.REFUNDED, "2000000");
        Debt debt = debt(sale, "2000000", DebtStatus.ACTIVE);

        assertThatThrownBy(() -> service.makePayment(debt.getId(), payment("2000000")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qaytarilgan yoki bekor qilingan");
    }

    @Test
    @DisplayName("Oddiy faol qarzga to'lov ishlashda davom etadi")
    void paymentOnActiveDebtStillWorks() {
        Sale sale = sale(SaleStatus.COMPLETED, "1000000");
        Debt debt = debt(sale, "1000000", DebtStatus.ACTIVE);

        service.makePayment(debt.getId(), payment("1000000"));

        Debt after = debtRepository.findById(debt.getId()).orElseThrow();
        assertThat(after.getRemainingAmount()).isEqualByComparingTo("0");
        assertThat(after.getStatus()).isEqualTo(DebtStatus.PAID);
    }

    // --- helpers ---

    private DebtPaymentRequest payment(String amount) {
        DebtPaymentRequest request = new DebtPaymentRequest();
        request.setAmount(new BigDecimal(amount));
        request.setMethod(PaymentMethod.CASH);
        return request;
    }

    private Sale sale(SaleStatus status, String debtAmount) {
        BigDecimal debt = new BigDecimal(debtAmount);
        return saleRepository.saveAndFlush(Sale.builder()
                .invoiceNumber("INV-D-" + System.nanoTime())
                .customer(buyer)
                .saleDate(LocalDateTime.now())
                .subtotal(debt)
                .totalAmount(debt)
                .paidAmount(BigDecimal.ZERO)
                .debtAmount(debt)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.UNPAID)
                .status(status)
                .createdBy(cashier)
                .build());
    }

    private Debt debt(Sale sale, String remaining, DebtStatus status) {
        return debtRepository.saveAndFlush(Debt.builder()
                .customer(buyer)
                .sale(sale)
                .originalAmount(sale.getTotalAmount())
                .remainingAmount(new BigDecimal(remaining))
                .dueDate(LocalDate.now().plusDays(30))
                .status(status)
                .build());
    }

    private static Customer customer() {
        return Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998901112255")
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-debt");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }
}
