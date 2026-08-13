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
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Sotuvni bekor qilishda qarz yozuvi sinxronligi.
 *
 * <p>Ilgari {@code cancelSale} "Cancel related debts" kommenti ostida faqat
 * mijoz balansini tiklardi — {@code debts} qatori to'liq summa bilan ACTIVE
 * qolaverar, dashboard mavjud bo'lmagan qarzni ko'rsatar va uni "undirish"
 * mumkin edi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:sale-cancel;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SaleCancelServiceTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private SaleService service;
    private User cashier;
    private Product product;

    @BeforeEach
    void setUp() {
        debtRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        product = productRepository.saveAndFlush(product(10));

        // cancelSale bildirishnoma/sozlama/hujjat servislariga tegmaydi — mock yetadi
        service = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), mock(DocumentNumberService.class),
                mock(CashShiftService.class));

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Bekor qilishda qarz yozuvi yopiladi — dashboard'da fantom qarz qolmaydi")
    void cancelClosesDebtRecordAndRestoresBalance() {
        Customer buyer = customerRepository.saveAndFlush(customer("-1500000"));
        Sale sale = creditSale(buyer, "1500000");
        Debt debt = debtFor(sale, "1500000");

        service.cancelSale(sale.getId());

        entityManager.flush();
        entityManager.clear();

        Debt after = debtRepository.findById(debt.getId()).orElseThrow();
        assertThat(after.getRemainingAmount()).isEqualByComparingTo("0");
        assertThat(after.getStatus()).isEqualTo(DebtStatus.CANCELLED);
        assertThat(debtRepository.getTotalActiveDebt())
                .as("dashboard'dagi jami faol qarz nolga tushishi kerak")
                .isEqualByComparingTo("0");
        assertThat(customerRepository.findById(buyer.getId()).orElseThrow().getBalance())
                .as("qarz uchun ayirilgan balans tiklanadi")
                .isEqualByComparingTo("0");
        assertThat(saleRepository.findById(sale.getId()).orElseThrow().getStatus())
                .isEqualTo(SaleStatus.CANCELLED);
    }

    @Test
    @DisplayName("Qarzsiz sotuvni bekor qilish qarz yozuvlariga tegmaydi")
    void cancelWithoutDebtIsNoOpOnDebts() {
        Sale sale = creditSale(null, "0");

        service.cancelSale(sale.getId());

        assertThat(debtRepository.count()).isZero();
        assertThat(saleRepository.findById(sale.getId()).orElseThrow().getStatus())
                .isEqualTo(SaleStatus.CANCELLED);
    }

    // --- helpers ---

    private Sale creditSale(Customer customer, String debtAmount) {
        BigDecimal debt = new BigDecimal(debtAmount);
        BigDecimal total = debt.signum() > 0 ? debt : new BigDecimal("500000");
        Sale sale = Sale.builder()
                .invoiceNumber("INV-C-" + System.nanoTime())
                .customer(customer)
                .saleDate(LocalDateTime.now())
                .subtotal(total)
                .totalAmount(total)
                .paidAmount(total.subtract(debt))
                .debtAmount(debt)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(debt.signum() > 0 ? PaymentStatus.UNPAID : PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale.getItems().add(SaleItem.builder()
                .sale(sale)
                .product(product)
                .quantity(1)
                .unitPrice(total)
                .discount(BigDecimal.ZERO)
                .totalPrice(total)
                .build());
        return saleRepository.saveAndFlush(sale);
    }

    private Debt debtFor(Sale sale, String amount) {
        return debtRepository.saveAndFlush(Debt.builder()
                .customer(sale.getCustomer())
                .sale(sale)
                .originalAmount(new BigDecimal(amount))
                .remainingAmount(new BigDecimal(amount))
                .dueDate(LocalDate.now().plusDays(30))
                .status(DebtStatus.ACTIVE)
                .build());
    }

    private static Customer customer(String balance) {
        return Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998901112244")
                .balance(new BigDecimal(balance))
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-cancel");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }

    private static Product product(int quantity) {
        return Product.builder()
                .sku("SKU-C-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("1000000"))
                .quantity(quantity)
                .active(true)
                .build();
    }
}
