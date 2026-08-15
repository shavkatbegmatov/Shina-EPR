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
import uz.shinamagazin.api.dto.request.PurchaseItemRequest;
import uz.shinamagazin.api.dto.request.PurchaseRequest;
import uz.shinamagazin.api.dto.response.PurchaseOrderResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.Supplier;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Xarid yaratishda to'lov chegarasi.
 *
 * <p>{@code addPayment} da "to'lov qolgan qarzdan katta bo'lmasin" chegarasi
 * bor edi, yaratishda esa yo'q: jami summadan ortiq to'lov tekshirilmasdan
 * PAID deb saqlanar, javobdagi {@code debtAmount} manfiyga tushardi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:purchase-overpay;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PurchaseOverpayTest {

    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired private PurchasePaymentRepository purchasePaymentRepository;
    @Autowired private PurchaseReturnRepository purchaseReturnRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private UserRepository userRepository;

    private PurchaseService service;
    private Supplier supplier;
    private Product product;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        purchaseReturnRepository.deleteAll();
        purchasePaymentRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        productRepository.deleteAll();
        supplierRepository.deleteAll();
        userRepository.deleteAll();

        User manager = userRepository.saveAndFlush(user());
        supplier = supplierRepository.saveAndFlush(Supplier.builder()
                .name("Test Ta'minotchi")
                .phone("+998901112288")
                .build());
        product = productRepository.saveAndFlush(Product.builder()
                .sku("SKU-OP-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("150000"))
                .quantity(0)
                .active(true)
                .build());

        DocumentNumberService documentNumbers = mock(DocumentNumberService.class);
        when(documentNumbers.nextPurchaseOrderNumber())
                .thenAnswer(inv -> "PO-OP-" + System.nanoTime());

        service = new PurchaseService(purchaseOrderRepository, purchaseOrderItemRepository,
                purchasePaymentRepository, purchaseReturnRepository, supplierRepository,
                productRepository, stockMovementRepository, userRepository,
                new SupplierService(supplierRepository), documentNumbers);

        CustomUserDetails principal = new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Jami summadan ortiq to'lov bilan xarid yaratib bo'lmaydi")
    void overpayOnCreateRejected() {
        // 10 × 100 000 = 1 000 000, to'lov 1 500 000
        assertThatThrownBy(() -> service.createPurchase(request("1500000")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("katta bo'lishi mumkin emas");
    }

    @Test
    @DisplayName("Aniq jami summa bilan to'lov ruxsat etiladi")
    void exactPaymentAllowed() {
        PurchaseOrderResponse response = service.createPurchase(request("1000000"));

        assertThat(response.getPaidAmount()).isEqualByComparingTo("1000000");
        assertThat(response.getDebtAmount()).isEqualByComparingTo("0");
    }

    // --- helpers ---

    private PurchaseRequest request(String paidAmount) {
        PurchaseItemRequest item = new PurchaseItemRequest();
        item.setProductId(product.getId());
        item.setQuantity(10);
        item.setUnitPrice(new BigDecimal("100000"));

        PurchaseRequest request = new PurchaseRequest();
        request.setSupplierId(supplier.getId());
        request.setOrderDate(LocalDate.now());
        request.setPaidAmount(new BigDecimal(paidAmount));
        request.setItems(List.of(item));
        return request;
    }

    private static User user() {
        User u = new User();
        u.setUsername("menejer-overpay");
        u.setPassword("{noop}x");
        u.setFullName("Menejer");
        u.setRole(Role.MANAGER);
        u.setActive(true);
        return u;
    }
}
