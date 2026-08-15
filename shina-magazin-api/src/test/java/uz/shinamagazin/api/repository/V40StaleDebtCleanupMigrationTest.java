package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;

import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V38 migratsiyasi: fantom qarzlarni tozalash.
 *
 * <p>1fdaa48 tuzatilishidan OLDIN qaytarish/bekor qilish {@code debts}
 * qatoriga tegmasdi — bazada qaytarilgan/bekor qilingan sotuvlarning
 * "faol" qarzlari qoldi. Migratsiya ularni yopishi, sog'lom qarzlarga
 * esa TEGMASLIGI shart.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:v38-cleanup;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class V38StaleDebtCleanupMigrationTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private User cashier;
    private Customer buyer;

    @BeforeEach
    void setUp() {
        debtRepository.deleteAll();
        saleRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        User u = new User();
        u.setUsername("kassir-v38");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        cashier = userRepository.saveAndFlush(u);

        buyer = customerRepository.saveAndFlush(Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998901112266")
                .build());
    }

    @Test
    @DisplayName("Fantom qarzlar yopiladi, sog'lomlari tegilmaydi")
    void cleansPhantomDebtsAndKeepsHealthyOnes() throws Exception {
        Debt cancelledSaleDebt = debt(sale(SaleStatus.CANCELLED, "1500000"), "1500000", DebtStatus.ACTIVE);
        Debt refundedSaleDebt = debt(sale(SaleStatus.REFUNDED, "0"), "2000000", DebtStatus.ACTIVE);
        Debt overdueOnCancelled = debt(sale(SaleStatus.CANCELLED, "800000"), "800000", DebtStatus.OVERDUE);
        // Qisman qaytarilgan: sotuvda 400 000 qarz qolgan, qator esa 1 000 000 deb turibdi
        Debt partiallyReturned = debt(sale(SaleStatus.COMPLETED, "400000"), "1000000", DebtStatus.ACTIVE);
        // Sog'lom faol qarz — sotuv bilan sinxron
        Debt healthy = debt(sale(SaleStatus.COMPLETED, "1000000"), "1000000", DebtStatus.ACTIVE);
        // Allaqachon to'langan qarz — statusi qanday bo'lsa shunday qoladi
        Debt paid = debt(sale(SaleStatus.REFUNDED, "0"), "0", DebtStatus.PAID);

        runMigration();

        assertThat(reload(cancelledSaleDebt))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount()).isEqualByComparingTo("0");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.CANCELLED);
                    assertThat(d.getNotes()).contains("V38");
                });
        assertThat(reload(refundedSaleDebt))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount()).isEqualByComparingTo("0");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.CANCELLED);
                });
        assertThat(reload(overdueOnCancelled))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount()).isEqualByComparingTo("0");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.CANCELLED);
                });
        assertThat(reload(partiallyReturned))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount())
                            .as("sotuvdagi haqiqiy qarz bilan tenglashtiriladi")
                            .isEqualByComparingTo("400000");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.ACTIVE);
                });
        assertThat(reload(healthy))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount()).isEqualByComparingTo("1000000");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.ACTIVE);
                    assertThat(d.getNotes()).as("sog'lom qarzga iz qoldirilmaydi").isNull();
                });
        assertThat(reload(paid))
                .satisfies(d -> assertThat(d.getStatus()).isEqualTo(DebtStatus.PAID));

        assertThat(debtRepository.getTotalActiveDebt())
                .as("dashboard endi faqat haqiqiy qarzlarni ko'rsatadi: 400k + 1M")
                .isEqualByComparingTo("1400000");
    }

    @Test
    @DisplayName("Tarixiy fantom to'lov sale.debt_amount ni manfiyga tushirgan bo'lsa ham 0 ga yopiladi")
    void negativeSaleDebtAmountIsFlooredAtZero() throws Exception {
        Debt corrupted = debt(sale(SaleStatus.COMPLETED, "-500000"), "500000", DebtStatus.ACTIVE);

        runMigration();

        assertThat(reload(corrupted))
                .satisfies(d -> {
                    assertThat(d.getRemainingAmount()).isEqualByComparingTo("0");
                    assertThat(d.getStatus()).isEqualTo(DebtStatus.CANCELLED);
                });
    }

    // --- helpers ---

    private void runMigration() {
        entityManager.flush();
        // Skript test tranzaksiyasining O'Z ulanishida bajarilishi shart:
        // alohida DataSource ulanishi commit qilinmagan fixture'larni ko'rmaydi.
        entityManager.unwrap(org.hibernate.Session.class).doWork(conn -> {
            try (Reader reader = new InputStreamReader(
                    getClass().getResourceAsStream(
                            "/db/migration/V38__cleanup_stale_debts_for_voided_sales.sql"),
                    StandardCharsets.UTF_8)) {
                org.h2.tools.RunScript.execute(conn, reader);
            } catch (java.io.IOException e) {
                throw new IllegalStateException("Migratsiya faylini o'qib bo'lmadi", e);
            }
        });
        entityManager.clear();
    }

    private Debt reload(Debt debt) {
        return debtRepository.findById(debt.getId()).orElseThrow();
    }

    private Sale sale(SaleStatus status, String debtAmount) {
        BigDecimal debt = new BigDecimal(debtAmount);
        BigDecimal total = debt.abs().max(new BigDecimal("500000"));
        return saleRepository.saveAndFlush(Sale.builder()
                .invoiceNumber("INV-V38-" + System.nanoTime())
                .customer(buyer)
                .saleDate(LocalDateTime.now())
                .subtotal(total)
                .totalAmount(total)
                .paidAmount(total.subtract(debt.max(BigDecimal.ZERO)))
                .debtAmount(debt)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PARTIAL)
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
}
