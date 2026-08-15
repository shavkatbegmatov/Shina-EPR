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
import uz.shinamagazin.api.dto.request.ReturnItemRequest;
import uz.shinamagazin.api.dto.request.ReturnRequest;
import uz.shinamagazin.api.dto.response.PurchaseReturnResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
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
 * Ustma-ust xarid qaytarishlari.
 *
 * <p>Yangi qaytarish faqat {@code receivedQuantity} bilan solishtirilardi —
 * u esa faqat COMPLETE paytida kamayadi. To'liq miqdorga bir nechta parallel
 * PENDING qaytarish yaratib, hammasini yakunlash mumkin edi:
 * {@code receivedQuantity} manfiyga tushar, ta'minotchi balansi esa har
 * biriga alohida kreditlanar edi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:purchase-returns;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PurchaseReturnOverlapTest {

    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired private PurchasePaymentRepository purchasePaymentRepository;
    @Autowired private PurchaseReturnRepository purchaseReturnRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private PurchaseService service;
    private User manager;
    private Supplier supplier;
    private Product product;
    private int seq;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        purchaseReturnRepository.deleteAll();
        purchasePaymentRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        productRepository.deleteAll();
        supplierRepository.deleteAll();
        userRepository.deleteAll();

        manager = userRepository.saveAndFlush(user());
        supplier = supplierRepository.saveAndFlush(supplier());
        product = productRepository.saveAndFlush(product(20));
        seq = 0;

        DocumentNumberService documentNumbers = mock(DocumentNumberService.class);
        when(documentNumbers.nextPurchaseReturnNumber())
                .thenAnswer(inv -> "PR-" + (++seq) + "-" + System.nanoTime());

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
    @DisplayName("To'liq miqdorga ikkinchi parallel qaytarish yaratib bo'lmaydi")
    void overlappingReturnRejectedAtCreation() {
        PurchaseOrder purchase = receivedPurchase(10);
        service.createReturn(purchase.getId(), returnOf(10));

        assertThatThrownBy(() -> service.createReturn(purchase.getId(), returnOf(1)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("band");
    }

    // Kvota guard'i har qatorni MUSTAQIL tekshirardi: bitta so'rovdagi
    // takroriy qatorlar bir xil qoldiqni ko'rib, ikkalasi ham o'tib ketardi.
    @Test
    @DisplayName("Bitta so'rovdagi takroriy qatorlar YIG'ILIB tekshiriladi")
    void duplicateLinesInOneRequestAreAggregated() {
        PurchaseOrder purchase = receivedPurchase(10);

        assertThatThrownBy(() -> service.createReturn(purchase.getId(), returnOfTwice(10, 10)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qaytarish mumkin bo'lgan miqdor");
    }

    @Test
    @DisplayName("Kvota ichidagi takroriy qatorlar bitta qatorga yig'iladi")
    void duplicateLinesWithinQuotaMergeIntoOneItem() {
        PurchaseOrder purchase = receivedPurchase(10);

        PurchaseReturnResponse response = service.createReturn(purchase.getId(), returnOfTwice(4, 6));

        PurchaseReturn saved = purchaseReturnRepository.findById(response.getId()).orElseThrow();
        assertThat(saved.getItems())
                .as("mahsulotga bitta qator, miqdor yig'indi")
                .singleElement()
                .satisfies(i -> assertThat(i.getReturnedQuantity()).isEqualTo(10));
        assertThat(saved.getRefundAmount())
                .as("summa ham ikki marta sanalmaydi")
                .isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("Kvota bir nechta qaytarish o'rtasida to'g'ri taqsimlanadi")
    void quotaIsSharedAcrossOutstandingReturns() {
        PurchaseOrder purchase = receivedPurchase(10);

        service.createReturn(purchase.getId(), returnOf(4));
        service.createReturn(purchase.getId(), returnOf(6));

        assertThatThrownBy(() -> service.createReturn(purchase.getId(), returnOf(1)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("band");
    }

    // COMPLETED qaytarish receivedQuantity'ni allaqachon kamaytirgan — uni
    // yana "band" deb sanash kvotani ikki marta qisqartirardi.
    @Test
    @DisplayName("Yakunlangan qaytarish kvotani ikki marta qisqartirmaydi")
    void completedReturnIsNotDoubleCounted() {
        PurchaseOrder purchase = receivedPurchase(10);

        PurchaseReturnResponse first = service.createReturn(purchase.getId(), returnOf(4));
        service.approveReturn(first.getId());
        service.completeReturn(first.getId()); // receivedQuantity 10 -> 6

        service.createReturn(purchase.getId(), returnOf(6)); // qolgan hammasi — ruxsat

        assertThatThrownBy(() -> service.createReturn(purchase.getId(), returnOf(1)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("O'chirilgan (PENDING) qaytarish kvotani bo'shatadi")
    void deletedReturnFreesQuota() {
        PurchaseOrder purchase = receivedPurchase(10);
        PurchaseReturnResponse first = service.createReturn(purchase.getId(), returnOf(10));

        service.deleteReturn(first.getId());

        // endi to'liq miqdorga yangi qaytarish yaratish mumkin
        assertThat(service.createReturn(purchase.getId(), returnOf(10)).getId()).isNotNull();
    }

    // Guard'dan OLDIN yaratilgan ustma-ust APPROVED qaytarishlar bazada
    // qolgan bo'lishi mumkin — ularni yakunlash endi bloklanadi.
    @Test
    @DisplayName("Eskirgan (guard'dan oldingi) qaytarish yakunlashda rad etiladi, balans bir marta kreditlanadi")
    void staleApprovedOverlapBlockedAtCompletion() {
        PurchaseOrder purchase = receivedPurchase(10);

        PurchaseReturnResponse first = service.createReturn(purchase.getId(), returnOf(10));
        service.approveReturn(first.getId());

        // Eski ustma-ust qaytarish simulyatsiyasi: guard chetlab o'tilib,
        // repository orqali to'g'ridan-to'g'ri APPROVED yozuv yaratiladi
        PurchaseReturn stale = staleApprovedReturn(purchase, 10);

        service.completeReturn(first.getId()); // receivedQuantity 10 -> 0, balans -1 000 000

        assertThatThrownBy(() -> service.completeReturn(stale.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon qaytarilgan");

        entityManager.flush();
        entityManager.clear();
        assertThat(supplierRepository.findById(supplier.getId()).orElseThrow().getBalance())
                .as("balans faqat birinchi qaytarish uchun kreditlangan")
                .isEqualByComparingTo("-1000000");
        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity())
                .as("ombor faqat bir marta kamaygan: 20 - 10")
                .isEqualTo(10);
    }

    // --- helpers ---

    /** RECEIVED xarid: bitta mahsulot, 100 000 dan {@code qty} dona qabul qilingan. */
    private PurchaseOrder receivedPurchase(int qty) {
        BigDecimal unit = new BigDecimal("100000");
        BigDecimal total = unit.multiply(BigDecimal.valueOf(qty));
        PurchaseOrder purchase = PurchaseOrder.builder()
                .orderNumber("PO-" + System.nanoTime())
                .supplier(supplier)
                .orderDate(LocalDate.now())
                .totalAmount(total)
                .paidAmount(total)
                .status(PurchaseOrderStatus.RECEIVED)
                .paymentStatus(PaymentStatus.PAID)
                .createdBy(manager)
                .build();
        PurchaseOrderItem item = PurchaseOrderItem.builder()
                .purchaseOrder(purchase)
                .product(product)
                .orderedQuantity(qty)
                .receivedQuantity(qty)
                .unitPrice(unit)
                .totalPrice(total)
                .build();
        purchase.getItems().add(item);
        return purchaseOrderRepository.saveAndFlush(purchase);
    }

    private ReturnRequest returnOf(int quantity) {
        ReturnItemRequest item = new ReturnItemRequest();
        item.setProductId(product.getId());
        item.setQuantity(quantity);

        ReturnRequest request = new ReturnRequest();
        request.setReturnDate(LocalDate.now());
        request.setReason("Sifatsiz partiya");
        request.setItems(List.of(item));
        return request;
    }

    /** Bitta so'rovda AYNI mahsulot ikki marta. */
    private ReturnRequest returnOfTwice(int first, int second) {
        ReturnItemRequest a = new ReturnItemRequest();
        a.setProductId(product.getId());
        a.setQuantity(first);
        ReturnItemRequest b = new ReturnItemRequest();
        b.setProductId(product.getId());
        b.setQuantity(second);

        ReturnRequest request = new ReturnRequest();
        request.setReturnDate(LocalDate.now());
        request.setReason("Sifatsiz partiya");
        request.setItems(List.of(a, b));
        return request;
    }

    private PurchaseReturn staleApprovedReturn(PurchaseOrder purchase, int quantity) {
        BigDecimal unit = new BigDecimal("100000");
        PurchaseReturn stale = PurchaseReturn.builder()
                .returnNumber("PR-STALE-" + System.nanoTime())
                .purchaseOrder(purchase)
                .returnDate(LocalDate.now())
                .reason("Eski ustma-ust qaytarish")
                .status(PurchaseReturnStatus.APPROVED)
                .refundAmount(unit.multiply(BigDecimal.valueOf(quantity)))
                .createdBy(manager)
                .build();
        stale.addItem(PurchaseReturnItem.builder()
                .purchaseReturn(stale)
                .product(product)
                .returnedQuantity(quantity)
                .unitPrice(unit)
                .totalPrice(unit.multiply(BigDecimal.valueOf(quantity)))
                .build());
        return purchaseReturnRepository.saveAndFlush(stale);
    }

    private static Supplier supplier() {
        return Supplier.builder()
                .name("Test Ta'minotchi")
                .phone("+998901112277")
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("menejer-return");
        u.setPassword("{noop}x");
        u.setFullName("Menejer");
        u.setRole(Role.MANAGER);
        u.setActive(true);
        return u;
    }

    private static Product product(int quantity) {
        return Product.builder()
                .sku("SKU-PR-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("150000"))
                .quantity(quantity)
                .active(true)
                .build();
    }
}
