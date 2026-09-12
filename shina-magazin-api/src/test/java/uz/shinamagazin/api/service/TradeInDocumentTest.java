package uz.shinamagazin.api.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.shinamagazin.api.dto.request.SaleItemRequest;
import uz.shinamagazin.api.dto.request.SaleRequest;
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
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
 * Barter hujjati — mijoz eski shinasini QOLDIRIB ketgan holat.
 *
 * <p>Bu yerda hujjatning hayot sikli qulflanadi: NEW (kassada kutmoqda) →
 * APPLIED (savdoda hisobga olingan) yoki CANCELLED. Asosiy qoidalar: shinalar
 * qabul paytidayoq omborga kiradi; hujjat faqat BIR MARTA va faqat o'z
 * mijozining savdosida ishlatiladi; savdoda ishlatilgan hujjat alohida bekor
 * qilinmaydi; savdo bekor qilinsa oldindan qabul qilingan hujjat yana NEW ga
 * qaytadi (mijozning krediti saqlanadi), savdo ichida qabul qilingani esa
 * bekor bo'ladi (shinalar mijozga qaytadi).
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:trade-in-doc;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TradeInDocumentTest {

    @Autowired private TradeInRepository tradeInRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private EntityManager entityManager;

    private TradeInService tradeInService;
    private SaleService saleService;
    private User cashier;
    private Customer customer;
    private Customer otherCustomer;
    /** Sotiladigan yangi shina (1 000 000). */
    private Product newTire;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        tradeInRepository.deleteAll();
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        brandRepository.deleteAll();
        customerRepository.deleteAll();
        shiftRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        customer = customerRepository.saveAndFlush(Customer.builder()
                .fullName("Muslihiddin aka").phone("+998904060036").build());
        otherCustomer = customerRepository.saveAndFlush(Customer.builder()
                .fullName("Boshqa mijoz").phone("+998901112233").build());
        newTire = productRepository.saveAndFlush(Product.builder()
                .sku("MCH-205-55-16")
                .name("Michelin Primacy 4 205/55 R16")
                .width(205).profile(55).diameter(16)
                .purchasePrice(new BigDecimal("700000"))
                .sellingPrice(new BigDecimal("1000000"))
                .quantity(10)
                .active(true)
                .build());

        DocumentNumberService documentNumbers = mock(DocumentNumberService.class);
        when(documentNumbers.nextInvoiceNumber()).thenAnswer(inv -> "INV-T-" + System.nanoTime());
        when(documentNumbers.nextTradeInNumber()).thenAnswer(inv -> "TI-T-" + System.nanoTime());

        CashShiftService shiftService = mock(CashShiftService.class);
        when(shiftService.findOpenShift(any())).thenReturn(Optional.empty());

        UsedProductService usedProducts = new UsedProductService(productRepository, categoryRepository, brandRepository);
        tradeInService = new TradeInService(tradeInRepository, productRepository, customerRepository,
                userRepository, stockMovementRepository, documentNumbers, shiftService, usedProducts);
        saleService = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository, saleReturnRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), documentNumbers, shiftService, tradeInService);

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Alohida qabul: hujjat NEW, eski shinalar darhol omborga, bo'sh kartochkaga tannarx = kredit")
    void acceptCreatesDocumentAndReceivesStock() {
        TradeInResponse doc = tradeInService.accept(request(customer, 4, "150000"));

        assertThat(doc.getStatus()).isEqualTo(TradeInStatus.NEW);
        assertThat(doc.isAcceptedInSale()).isFalse();
        assertThat(doc.getTotalAmount()).isEqualByComparingTo("600000");
        assertThat(doc.getTotalQuantity()).isEqualTo(4);
        assertThat(doc.getCustomerName()).isEqualTo("Muslihiddin aka");
        assertThat(doc.getSaleId()).isNull();
        assertThat(doc.getItems()).hasSize(1);
        assertThat(doc.getItems().get(0).getDescription()).isEqualTo("Michelin, protektor 60%");

        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getQuantity()).isEqualTo(4);
        assertThat(used.getPurchasePrice()).isEqualByComparingTo("150000");

        StockMovement movement = stockMovementRepository.findAll().stream()
                .filter(m -> "TRADE_IN".equals(m.getReferenceType())).findFirst().orElseThrow();
        assertThat(movement.getReferenceId()).isEqualTo(doc.getId());
        assertThat(movement.getQuantity()).isEqualTo(4);

        // Kassada tanlash uchun ro'yxatda
        assertThat(tradeInService.getAvailable(customer.getId())).extracting(TradeInResponse::getId)
                .containsExactly(doc.getId());
        assertThat(tradeInService.getAvailable(otherCustomer.getId())).isEmpty();
    }

    @Test
    @DisplayName("Kartochkada tovar bor bo'lsa tannarx o'rtacha tortiladi — bitta arzon shina uni tushirmaydi")
    void costIsBlendedWhenCardHasStock() {
        tradeInService.accept(request(customer, 4, "250000"));
        tradeInService.accept(request(customer, 1, "50000"));

        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getQuantity()).isEqualTo(5);
        // (4 × 250 000 + 1 × 50 000) / 5 = 210 000
        assertThat(used.getPurchasePrice()).isEqualByComparingTo("210000");
    }

    @Test
    @DisplayName("Oldindan qabul qilingan hujjat savdoda: qiymat to'liq, kassaga farq, hujjat APPLIED")
    void existingDocumentIsAppliedInSale() {
        TradeInResponse doc = tradeInService.accept(request(customer, 4, "150000"));
        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getQuantity()).isEqualTo(4);

        SaleRequest request = saleRequest(customer, 4, "3400000");
        request.setTradeInId(doc.getId());
        SaleResponse sale = saleService.createSale(request);

        assertThat(sale.getTotalAmount()).isEqualByComparingTo("4000000");
        assertThat(sale.getTradeInAmount()).isEqualByComparingTo("600000");
        assertThat(sale.getAmountDue()).isEqualByComparingTo("3400000");
        assertThat(sale.getPaidAmount()).isEqualByComparingTo("3400000");
        assertThat(sale.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(sale.getTradeInItems()).hasSize(1);
        assertThat(sale.getTradeInDocuments()).extracting(SaleResponse.TradeInDocument::getId)
                .containsExactly(doc.getId());

        TradeIn persisted = tradeInRepository.findById(doc.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(TradeInStatus.APPLIED);
        assertThat(persisted.getSale().getId()).isEqualTo(sale.getId());

        // Shinalar qabul paytida kirgan edi — savdoda ikkinchi marta kirim bo'lmaydi
        assertThat(reload(used).getQuantity()).isEqualTo(4);
        assertThat(stockMovementRepository.findAll().stream()
                .filter(m -> "TRADE_IN".equals(m.getReferenceType())).count()).isEqualTo(1);
        assertThat(tradeInService.getAvailable(customer.getId())).isEmpty();
    }

    @Test
    @DisplayName("Oldindan qabul qilingan hujjat va kassadagi yangi shinalar bitta savdoda qo'shiladi")
    void existingDocumentAndInlineItemsAreSummed() {
        TradeInResponse doc = tradeInService.accept(request(customer, 2, "150000"));

        SaleRequest request = saleRequest(customer, 4, "3400000");
        request.setTradeInId(doc.getId());
        request.setTradeInItems(List.of(tradeInItem(2, "150000")));
        SaleResponse sale = saleService.createSale(request);

        assertThat(sale.getTradeInAmount()).isEqualByComparingTo("600000");
        assertThat(sale.getAmountDue()).isEqualByComparingTo("3400000");
        assertThat(sale.getTradeInDocuments()).hasSize(2);
        assertThat(sale.getTradeInItems()).hasSize(2);
        assertThat(tradeInRepository.findBySaleId(sale.getId())).hasSize(2);
        assertThat(productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow().getQuantity()).isEqualTo(4);
    }

    @Test
    @DisplayName("Hujjat faqat bir marta ishlatiladi")
    void documentIsSingleUse() {
        TradeInResponse doc = tradeInService.accept(request(customer, 1, "150000"));

        SaleRequest first = saleRequest(customer, 1, "850000");
        first.setTradeInId(doc.getId());
        saleService.createSale(first);

        SaleRequest second = saleRequest(customer, 1, "850000");
        second.setTradeInId(doc.getId());
        assertThatThrownBy(() -> saleService.createSale(second))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon ishlatilgan");
    }

    @Test
    @DisplayName("Boshqa mijozning hujjati va mijozsiz savdo rad etiladi")
    void documentMustBelongToSaleCustomer() {
        TradeInResponse doc = tradeInService.accept(request(customer, 1, "150000"));

        SaleRequest wrongCustomer = saleRequest(otherCustomer, 1, "850000");
        wrongCustomer.setTradeInId(doc.getId());
        assertThatThrownBy(() -> saleService.createSale(wrongCustomer))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("boshqa mijozga");

        SaleRequest anonymous = saleRequest(null, 1, "850000");
        anonymous.setTradeInId(doc.getId());
        assertThatThrownBy(() -> saleService.createSale(anonymous))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("mijoz tanlash shart");

        // Hujjat tegilmagan
        assertThat(tradeInRepository.findById(doc.getId()).orElseThrow().getStatus()).isEqualTo(TradeInStatus.NEW);
        assertThat(saleRepository.count()).isZero();
    }

    @Test
    @DisplayName("Savdo bekor qilinsa oldindan qabul qilingan hujjat yana NEW — kredit saqlanadi, shinalar omborda")
    void cancellingSaleReleasesPreAcceptedDocument() {
        TradeInResponse doc = tradeInService.accept(request(customer, 4, "250000"));
        SaleRequest request = saleRequest(customer, 4, "0"); // pul tushmagan — bekor qilish mumkin
        request.setTradeInId(doc.getId());
        SaleResponse sale = saleService.createSale(request);

        saleService.cancelSale(sale.getId());

        TradeIn released = tradeInRepository.findById(doc.getId()).orElseThrow();
        assertThat(released.getStatus()).isEqualTo(TradeInStatus.NEW);
        assertThat(released.getSale()).isNull();
        assertThat(productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow().getQuantity())
                .as("shinalar mijozga qaytarilmaydi — u ularni qoldirib ketgan").isEqualTo(4);
        assertThat(stockMovementRepository.findAll())
                .noneMatch(m -> "TRADE_IN_CANCEL".equals(m.getReferenceType()));
        assertThat(tradeInService.getAvailable(customer.getId())).extracting(TradeInResponse::getId)
                .containsExactly(doc.getId());
    }

    @Test
    @DisplayName("Savdo ichida qabul qilingan hujjat savdo bekor qilinganda CANCELLED — shinalar mijozga qaytadi")
    void cancellingSaleCancelsInlineDocument() {
        SaleRequest request = saleRequest(customer, 4, "0");
        request.setTradeInItems(List.of(tradeInItem(4, "250000")));
        SaleResponse sale = saleService.createSale(request);
        assertThat(productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow().getQuantity()).isEqualTo(4);

        saleService.cancelSale(sale.getId());

        TradeIn document = tradeInRepository.findBySaleId(sale.getId()).get(0);
        assertThat(document.isAcceptedInSale()).isTrue();
        assertThat(document.getStatus()).isEqualTo(TradeInStatus.CANCELLED);
        assertThat(productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow().getQuantity()).isZero();
    }

    @Test
    @DisplayName("Savdoda ishlatilgan hujjatni alohida bekor qilib bo'lmaydi")
    void appliedDocumentCannotBeCancelledDirectly() {
        TradeInResponse doc = tradeInService.accept(request(customer, 1, "150000"));
        SaleRequest request = saleRequest(customer, 1, "850000");
        request.setTradeInId(doc.getId());
        saleService.createSale(request);

        assertThatThrownBy(() -> tradeInService.cancel(doc.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("avval savdoni bekor qiling");
    }

    @Test
    @DisplayName("Ishlatilmagan hujjat bekor qilinsa shinalar mijozga qaytadi; sotilib ketgan bo'lsa — to'siladi")
    void cancelReversesStockUnlessAlreadySold() {
        TradeInResponse doc = tradeInService.accept(request(customer, 3, "80000"));
        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getQuantity()).isEqualTo(3);

        TradeInResponse cancelled = tradeInService.cancel(doc.getId());
        assertThat(cancelled.getStatus()).isEqualTo(TradeInStatus.CANCELLED);
        assertThat(reload(used).getQuantity()).isZero();
        assertThat(stockMovementRepository.findAll())
                .anyMatch(m -> "TRADE_IN_CANCEL".equals(m.getReferenceType())
                        && m.getQuantity() == -3 && doc.getId().equals(m.getReferenceId()));
        assertThatThrownBy(() -> tradeInService.cancel(doc.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon bekor qilingan");

        // Ikkinchi hujjat: shinalar sotilib ketgan — bekor qilish to'siladi
        TradeInResponse second = tradeInService.accept(request(customer, 2, "80000"));
        Product reloaded = reload(used);
        reloaded.setQuantity(1);
        productRepository.saveAndFlush(reloaded);
        assertThatThrownBy(() -> tradeInService.cancel(second.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon sotilgan");
    }

    @Test
    @DisplayName("Ro'yxat holat va mijoz bo'yicha filtrlanadi")
    void listIsFilteredByStatusAndCustomer() {
        TradeInResponse mine = tradeInService.accept(request(customer, 1, "100000"));
        TradeInResponse other = tradeInService.accept(request(otherCustomer, 1, "100000"));
        tradeInService.cancel(other.getId());

        assertThat(tradeInService.getAll(null, null, PageRequest.of(0, 10)).getTotalElements()).isEqualTo(2);
        assertThat(tradeInService.getAll(TradeInStatus.NEW, null, PageRequest.of(0, 10)).getContent())
                .extracting(TradeInResponse::getId).containsExactly(mine.getId());
        assertThat(tradeInService.getAll(null, otherCustomer.getId(), PageRequest.of(0, 10)).getContent())
                .extracting(TradeInResponse::getId).containsExactly(other.getId());
        assertThat(tradeInService.getAll(TradeInStatus.CANCELLED, customer.getId(), PageRequest.of(0, 10))
                .getTotalElements()).isZero();
    }

    // --- helpers ---

    private TradeInRequest request(Customer forCustomer, int quantity, String unitValue) {
        return TradeInRequest.builder()
                .customerId(forCustomer.getId())
                .items(List.of(tradeInItem(quantity, unitValue)))
                .notes("mijoz shinasini qoldirib ketdi")
                .build();
    }

    private static TradeInItemRequest tradeInItem(int quantity, String unitValue) {
        return TradeInItemRequest.builder()
                .width(205).profile(55).diameter(16)
                .brandName("Michelin")
                .condition("protektor 60%")
                .quantity(quantity)
                .unitValue(new BigDecimal(unitValue))
                .resalePrice(new BigDecimal("250000"))
                .build();
    }

    /** {@code quantity} dona yangi shina (1 000 000 dan), {@code paid} to'lanadi. */
    private SaleRequest saleRequest(Customer forCustomer, int quantity, String paid) {
        return SaleRequest.builder()
                .customerId(forCustomer != null ? forCustomer.getId() : null)
                .items(List.of(SaleItemRequest.builder()
                        .productId(newTire.getId())
                        .quantity(quantity)
                        .build()))
                .paidAmount(new BigDecimal(paid))
                .paymentMethod(PaymentMethod.CASH)
                .build();
    }

    private Product reload(Product product) {
        entityManager.flush();
        entityManager.clear();
        return productRepository.findById(product.getId()).orElseThrow();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-trade-in-doc");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }
}
