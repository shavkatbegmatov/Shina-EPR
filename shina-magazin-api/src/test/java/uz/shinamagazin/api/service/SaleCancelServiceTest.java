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
import uz.shinamagazin.api.dto.request.CreateSaleReturnRequest;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * Sotuvni bekor qilish: qarz sinxronligi va qaytarish bilan to'qnashuv.
 *
 * <p>Ikkita tuzatilgan xato qulflanadi:
 * <ul>
 *   <li>bekor qilish {@code debts} qatorini yopmasdi — dashboard mavjud
 *       bo'lmagan qarzni ko'rsatar va uni "undirish" mumkin edi;
 *   <li>qaytarish boshlangan sotuvni bekor qilish OMBORNI IKKI MARTA
 *       to'ldirardi: restoreStock qaytarilgan donalarni allaqachon kirim
 *       qilgan, cancel esa to'liq asl miqdorni yana qo'shardi.
 * </ul>
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
    @Autowired private SaleItemRepository saleItemRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private SaleService service;
    private SaleReturnService returnService;
    private User cashier;
    private Product product;

    /** Hujjat raqami — H2'da `ON CONFLICT` yo'q, shuning uchun oddiy hisoblagich. */
    private static class SequentialNumbers extends DocumentNumberService {
        private int n = 0;
        @Override public String nextSaleReturnNumber() { return "SR-" + (++n); }
    }

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        shiftRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        product = productRepository.saveAndFlush(product(10));

        // cancelSale bildirishnoma/sozlama/hujjat servislariga tegmaydi — mock yetadi
        service = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository, saleReturnRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), mock(DocumentNumberService.class),
                mock(CashShiftService.class));

        // Qaytarishlar REAL servis orqali — u omborni ham tiklaydi, aynan
        // shu bilan "ikki marta to'ldirish" ssenariysi haqiqiy bo'ladi.
        CashShiftService shiftService = new CashShiftService(
                shiftRepository, userRepository, saleReturnRepository, expenseRepository);
        returnService = new SaleReturnService(saleReturnRepository, saleRepository,
                saleItemRepository, productRepository, stockMovementRepository,
                customerRepository, userRepository, new SequentialNumbers(), shiftService,
                debtRepository);

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ─── Qarz sinxronligi ───

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

    // ─── Qaytarishdan keyin bekor qilish ───
    // Audit ssenariysi: 10 dona bor, 4 tasi sotildi (qoldiq 6), 2 tasi
    // qaytarildi (qoldiq 8). Bekor qilishga ruxsat berilsa, to'liq 4 dona
    // yana qo'shilib qoldiq 12 bo'lardi — 10 donadan ortiq "tovar" paydo
    // bo'lar, 2 tasi esa hali mijozda.

    @Test
    @DisplayName("Qisman qaytarilgan sotuvni bekor qilib bo'lmaydi — ombor ikki marta to'lmaydi")
    void cancelRejectedAfterPartialReturn() {
        Sale sale = soldItems(4);
        assertThat(reloadProduct().getQuantity()).isEqualTo(6);

        returnService.createReturn(sale.getId(), cashier.getId(), returnOf(sale, 2));
        assertThat(reloadProduct().getQuantity()).isEqualTo(8);

        assertThatThrownBy(() -> service.cancelSale(sale.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qaytarishlar bor");

        assertThat(reloadProduct().getQuantity())
                .as("ilgari bekor qilish 8 → 12 qilib, mavjud bo'lmagan 2 dona paydo qilardi")
                .isEqualTo(8);
        assertThat(saleRepository.findById(sale.getId()).orElseThrow().getStatus())
                .isEqualTo(SaleStatus.COMPLETED);
    }

    @Test
    @DisplayName("To'liq qaytarilgan (REFUNDED) sotuvni bekor qilib bo'lmaydi")
    void cancelRejectedForRefundedSale() {
        Sale sale = soldItems(2);
        returnService.createReturn(sale.getId(), cashier.getId(), returnOf(sale, 2));
        assertThat(saleRepository.findById(sale.getId()).orElseThrow().getStatus())
                .isEqualTo(SaleStatus.REFUNDED);
        assertThat(reloadProduct().getQuantity()).isEqualTo(10);

        assertThatThrownBy(() -> service.cancelSale(sale.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("to'liq qaytarilgan");

        assertThat(reloadProduct().getQuantity())
                .as("ombor 10 taligicha qoladi, 12 emas")
                .isEqualTo(10);
        assertThat(saleRepository.findById(sale.getId()).orElseThrow().getStatus())
                .as("REFUNDED holat saqlanadi — hisobotda daromad ikki marta jazolanmaydi")
                .isEqualTo(SaleStatus.REFUNDED);
    }

    // --- helpers ---

    /** Sotuv: createSale kabi sotilgan dona ombordan ayiriladi. */
    private Sale soldItems(int qty) {
        BigDecimal unit = new BigDecimal("100000");
        BigDecimal total = unit.multiply(BigDecimal.valueOf(qty));
        Sale sale = Sale.builder()
                .invoiceNumber("INV-C-" + System.nanoTime())
                .saleDate(LocalDateTime.now())
                .subtotal(total)
                .totalAmount(total)
                .paidAmount(total)
                .debtAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale.getItems().add(SaleItem.builder()
                .sale(sale)
                .product(product)
                .quantity(qty)
                .unitPrice(unit)
                .discount(BigDecimal.ZERO)
                .totalPrice(total)
                .build());
        product.setQuantity(product.getQuantity() - qty);
        productRepository.save(product);
        return saleRepository.saveAndFlush(sale);
    }

    private CreateSaleReturnRequest returnOf(Sale sale, int quantity) {
        Sale fresh = saleRepository.findByIdWithItems(sale.getId()).orElseThrow();
        CreateSaleReturnRequest.Item item = new CreateSaleReturnRequest.Item();
        item.setSaleItemId(fresh.getItems().get(0).getId());
        item.setQuantity(quantity);

        CreateSaleReturnRequest request = new CreateSaleReturnRequest();
        request.setItems(List.of(item));
        request.setReason("Mijoz qaytardi");
        return request;
    }

    private Product reloadProduct() {
        entityManager.flush();
        entityManager.clear();
        return productRepository.findById(product.getId()).orElseThrow();
    }

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
