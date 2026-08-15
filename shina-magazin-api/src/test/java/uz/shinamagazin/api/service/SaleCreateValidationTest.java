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
import uz.shinamagazin.api.dto.request.SaleItemRequest;
import uz.shinamagazin.api.dto.request.SaleRequest;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Sotuv yaratishda chegirma chegaralari.
 *
 * <p>DTO'da faqat pastki chegara bor edi (@DecimalMin 0): savdo chegirmasi
 * subtotal'dan, qator chegirmasi qator summasidan katta bo'lsa, jami MANFIY
 * bo'lib sotuv COMPLETED/PAID holatda saqlanardi — revenue, Z-hisobot va
 * dashboard buzilardi. POS'dagi clamp ham himoya emas edi: tovar olib
 * tashlanganda chegirma qayta tekshirilmasdi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:sale-validation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SaleCreateValidationTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;

    private SaleService service;
    private Product product;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        User cashier = userRepository.saveAndFlush(user());
        product = productRepository.saveAndFlush(product(20));

        DocumentNumberService documentNumbers = mock(DocumentNumberService.class);
        when(documentNumbers.nextInvoiceNumber()).thenReturn("INV-V-" + System.nanoTime());
        CashShiftService cashShiftService = mock(CashShiftService.class);
        when(cashShiftService.findOpenShift(any())).thenReturn(Optional.empty());

        service = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository, saleReturnRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), documentNumbers, cashShiftService);

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Savdo chegirmasi subtotal'dan katta bo'lsa sotuv rad etiladi")
    void saleDiscountGreaterThanSubtotalRejected() {
        // 1 dona × 500 000, chegirma 600 000 → jami −100 000 bo'lardi
        SaleRequest request = request(1, "600000", "0");

        assertThatThrownBy(() -> service.createSale(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("savdo summasidan katta");
    }

    @Test
    @DisplayName("Qator chegirmasi qator summasidan katta bo'lsa sotuv rad etiladi")
    void itemDiscountGreaterThanLineTotalRejected() {
        SaleRequest request = SaleRequest.builder()
                .items(List.of(SaleItemRequest.builder()
                        .productId(product.getId())
                        .quantity(1)
                        .discount(new BigDecimal("600000")) // qator 500 000
                        .build()))
                .paidAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CASH)
                .build();

        assertThatThrownBy(() -> service.createSale(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qator summasidan katta");
    }

    @Test
    @DisplayName("To'liq chegirma (jami = 0) ruxsat etiladi")
    void fullDiscountIsAllowed() {
        SaleResponse response = service.createSale(request(1, "500000", "0"));

        assertThat(response.getTotalAmount()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Oddiy chegirmali sotuv ishlashda davom etadi")
    void validDiscountStillWorks() {
        SaleResponse response = service.createSale(request(2, "100000", "900000"));

        assertThat(response.getTotalAmount()).isEqualByComparingTo("900000");
        assertThat(response.getDiscountAmount()).isEqualByComparingTo("100000");
    }

    // --- helpers ---

    /** {@code quantity} dona (500 000 dan), savdo chegirmasi va to'lov bilan so'rov. */
    private SaleRequest request(int quantity, String discountAmount, String paid) {
        return SaleRequest.builder()
                .items(List.of(SaleItemRequest.builder()
                        .productId(product.getId())
                        .quantity(quantity)
                        .build()))
                .discountAmount(new BigDecimal(discountAmount))
                .paidAmount(new BigDecimal(paid))
                .paymentMethod(PaymentMethod.CASH)
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-validation");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }

    private static Product product(int quantity) {
        return Product.builder()
                .sku("SKU-V-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("500000"))
                .quantity(quantity)
                .active(true)
                .build();
    }
}
