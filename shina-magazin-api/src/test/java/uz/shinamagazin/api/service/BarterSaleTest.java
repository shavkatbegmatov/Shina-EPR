package uz.shinamagazin.api.service;

import jakarta.persistence.EntityManager;
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
import uz.shinamagazin.api.dto.request.SaleItemRequest;
import uz.shinamagazin.api.dto.request.SaleRequest;
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.dto.response.SaleReturnResponse;
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
 * Barter: mijoz eski shinalarini beradi, yangisini oladi, FARQNI to'laydi.
 *
 * <p>Bu yerda uch narsa qulflanadi: (1) daromad to'liq narxda, kassaga esa
 * faqat farq tushadi; (2) eski shinalar B/U mahsulot sifatida omborga
 * kiradi — bir o'lcham bitta kartochkada yig'iladi; (3) qaytarishda naqd
 * faqat kassaga tushgan qismgacha, qolgani mijoz balansiga kredit.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:barter-sale;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BarterSaleTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleItemRepository saleItemRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private TradeInRepository tradeInRepository;
    @Autowired private EntityManager entityManager;

    private SaleService service;
    private SaleReturnService returnService;
    private User cashier;
    private Customer customer;
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
                .fullName("Muslihiddin aka")
                .phone("+998904060036")
                .build());
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
        when(documentNumbers.nextInvoiceNumber()).thenAnswer(inv -> "INV-B-" + System.nanoTime());
        when(documentNumbers.nextSaleReturnNumber()).thenAnswer(inv -> "SR-B-" + System.nanoTime());
        when(documentNumbers.nextTradeInNumber()).thenAnswer(inv -> "TI-B-" + System.nanoTime());

        CashShiftService shiftService = mock(CashShiftService.class);
        when(shiftService.findOpenShift(any())).thenReturn(Optional.empty());

        UsedProductService usedProducts = new UsedProductService(productRepository, categoryRepository, brandRepository);
        TradeInService tradeIns = new TradeInService(tradeInRepository, productRepository, customerRepository,
                userRepository, stockMovementRepository, documentNumbers, shiftService, usedProducts);

        service = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository, saleReturnRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), documentNumbers, shiftService, tradeIns);

        returnService = new SaleReturnService(saleReturnRepository, saleRepository, saleItemRepository,
                productRepository, stockMovementRepository, customerRepository, userRepository,
                documentNumbers, shiftService, debtRepository);

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("4 eski shina evaziga 4 yangi: daromad to'liq, kassaga farq, eski shinalar B/U mahsulot bo'lib omborga")
    void barterSaleCreatesUsedProductAndChargesDifference() {
        SaleResponse sale = service.createSale(barterRequest(4, "150000", "3400000"));

        assertThat(sale.getTotalAmount()).as("daromad to'liq narxda").isEqualByComparingTo("4000000");
        assertThat(sale.getTradeInAmount()).isEqualByComparingTo("600000");
        assertThat(sale.getAmountDue()).isEqualByComparingTo("3400000");
        assertThat(sale.getPaidAmount()).isEqualByComparingTo("3400000");
        assertThat(sale.getDebtAmount()).isEqualByComparingTo("0");
        assertThat(sale.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(sale.getTradeInItems()).hasSize(1);
        assertThat(sale.getTradeInItems().get(0).getTotalValue()).isEqualByComparingTo("600000");
        assertThat(sale.getTradeInItems().get(0).getDescription()).isEqualTo("Michelin, protektor 60%");

        // Savdo ichidagi barter ham hujjat: darhol APPLIED, savdoga bog'langan
        assertThat(sale.getTradeInDocuments()).hasSize(1);
        TradeIn document = tradeInRepository.findBySaleId(sale.getId()).get(0);
        assertThat(document.getStatus()).isEqualTo(TradeInStatus.APPLIED);
        assertThat(document.isAcceptedInSale()).isTrue();
        assertThat(document.getTotalAmount()).isEqualByComparingTo("600000");
        assertThat(document.getCustomer().getId()).isEqualTo(customer.getId());
        assertThat(sale.getTradeInDocuments().get(0).getDocumentNumber()).isEqualTo(document.getDocumentNumber());

        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getName()).isEqualTo("B/U Michelin 205/55 R16");
        assertThat(used.getQuantity()).isEqualTo(4);
        assertThat(used.getPurchasePrice()).as("tannarx = berilgan kredit").isEqualByComparingTo("150000");
        assertThat(used.getSellingPrice()).isEqualByComparingTo("250000");
        assertThat(used.getMinStockLevel()).isZero();
        assertThat(used.getCategory().getName()).isEqualTo(UsedProductService.USED_CATEGORY_NAME);
        assertThat(used.getBrand()).as("brend avtomatik yaratilmaydi").isNull();

        assertThat(reload(newTire).getQuantity()).isEqualTo(6);

        StockMovement tradeIn = stockMovementRepository.findAll().stream()
                .filter(m -> "TRADE_IN".equals(m.getReferenceType()))
                .findFirst().orElseThrow();
        assertThat(tradeIn.getMovementType()).isEqualTo(MovementType.IN);
        assertThat(tradeIn.getQuantity()).isEqualTo(4);
        assertThat(tradeIn.getReferenceId()).as("harakat hujjatga ishora qiladi").isEqualTo(document.getId());
        assertThat(tradeIn.getUnitPrice()).isEqualByComparingTo("150000");

        // Qarz yo'q — mijoz balansi tegilmagan
        assertThat(reloadCustomer().getBalance()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Bir o'lchamdagi eski shinalar bitta B/U kartochkada yig'iladi, tannarx o'rtacha tortilgan")
    void sameSizeAccumulatesInOneUsedProduct() {
        service.createSale(barterRequest(2, "150000", "1700000"));
        service.createSale(barterRequest(2, "120000", "1760000"));

        List<Product> used = productRepository.findAll().stream()
                .filter(p -> p.getSku().startsWith(UsedProductService.SKU_PREFIX))
                .toList();
        assertThat(used).hasSize(1);
        assertThat(used.get(0).getQuantity()).isEqualTo(4);
        // (2 × 150 000 + 2 × 120 000) / 4 — bitta arzon baholangan shina butun
        // qoldiqning tannarxini tushirmaydi, "oxirgi narx yutadi" ham emas
        assertThat(used.get(0).getPurchasePrice()).as("o'rtacha tortilgan tannarx")
                .isEqualByComparingTo("135000");
    }

    @Test
    @DisplayName("Barter mijozsiz va savdo summasidan ortiq kredit bilan rasmiylashtirilmaydi")
    void barterValidation() {
        SaleRequest anonymous = barterRequest(4, "150000", "3400000");
        anonymous.setCustomerId(null);
        assertThatThrownBy(() -> service.createSale(anonymous))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("mijoz tanlash shart");

        // 4 × 1 100 000 = 4 400 000 > 4 000 000
        assertThatThrownBy(() -> service.createSale(barterRequest(4, "1100000", "0")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("savdo summasidan");

        // Xato so'rov savdo yozmagan bo'lishi kerak (zaxira tranzaksiya
        // orqali qaytadi — bu testda servis proksisiz, shuning uchun
        // tekshirilmaydi)
        assertThat(saleRepository.count()).isZero();
    }

    @Test
    @DisplayName("Farqning bir qismi qarzga: qarz faqat farqdan, barter qismidan emas")
    void debtIsComputedFromDifference() {
        SaleResponse sale = service.createSale(barterRequest(4, "150000", "2000000"));

        assertThat(sale.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIAL);
        assertThat(sale.getDebtAmount()).isEqualByComparingTo("1400000");

        List<Debt> debts = debtRepository.findAll();
        assertThat(debts).hasSize(1);
        assertThat(debts.get(0).getRemainingAmount()).isEqualByComparingTo("1400000");
        assertThat(reloadCustomer().getBalance()).isEqualByComparingTo("-1400000");
    }

    @Test
    @DisplayName("To'liq barter (pul tushmagan) bekor qilinsa eski shinalar mijozga qaytariladi")
    void cancelReversesTradeIn() {
        SaleResponse sale = service.createSale(barterRequest(4, "1000000", "0"));
        assertThat(sale.getPaidAmount()).isEqualByComparingTo("0");
        assertThat(sale.getPaymentStatus()).as("to'lanadigan summa 0 — to'langan").isEqualTo(PaymentStatus.PAID);

        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        assertThat(used.getQuantity()).isEqualTo(4);

        SaleResponse cancelled = service.cancelSale(sale.getId());

        assertThat(cancelled.getStatus()).isEqualTo(SaleStatus.CANCELLED);
        assertThat(reload(used).getQuantity()).isZero();
        assertThat(reload(newTire).getQuantity()).isEqualTo(10);
        assertThat(stockMovementRepository.findAll())
                .anyMatch(m -> "TRADE_IN_CANCEL".equals(m.getReferenceType()) && m.getQuantity() == -4);
        // Savdo ichida qabul qilingan hujjat ham bekor bo'ladi
        assertThat(tradeInRepository.findBySaleId(sale.getId()).get(0).getStatus())
                .isEqualTo(TradeInStatus.CANCELLED);
    }

    @Test
    @DisplayName("B/U shinalar allaqachon sotilgan bo'lsa barter savdosi bekor qilinmaydi")
    void cancelBlockedWhenUsedTiresAlreadySold() {
        SaleResponse sale = service.createSale(barterRequest(4, "1000000", "0"));
        Product used = productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow();
        used.setQuantity(1); // 3 tasi sotilib ketgan
        productRepository.saveAndFlush(used);

        assertThatThrownBy(() -> service.cancelSale(sale.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon sotilgan");
    }

    @Test
    @DisplayName("Barter savdosi qaytarilsa naqd faqat kassaga tushgan qismgacha, qolgani mijoz balansiga kredit")
    void returnCapsCashAtPaidAndIssuesCredit() {
        // 4 000 000 lik savdo: 1 000 000 eski shinalar, 3 000 000 naqd
        SaleResponse sale = service.createSale(barterRequest(4, "250000", "3000000"));
        Sale persisted = saleRepository.findByIdWithItems(sale.getId()).orElseThrow();
        Long saleItemId = persisted.getItems().get(0).getId();

        CreateSaleReturnRequest request = new CreateSaleReturnRequest();
        CreateSaleReturnRequest.Item item = new CreateSaleReturnRequest.Item();
        item.setSaleItemId(saleItemId);
        item.setQuantity(4);
        request.setItems(List.of(item));

        SaleReturnResponse ret = returnService.createReturn(sale.getId(), cashier.getId(), request);

        assertThat(ret.getRefundAmount()).isEqualByComparingTo("4000000");
        assertThat(ret.getDebtReduced()).isEqualByComparingTo("0");
        assertThat(ret.getCashRefunded()).as("kassadan chiqqan pul tushganidan ko'p emas")
                .isEqualByComparingTo("3000000");
        assertThat(ret.getCreditIssued()).isEqualByComparingTo("1000000");

        Sale after = reloadSale(sale.getId());
        assertThat(after.getPaidAmount()).isEqualByComparingTo("0");
        assertThat(after.getStatus()).isEqualTo(SaleStatus.REFUNDED);
        assertThat(reloadCustomer().getBalance()).as("do'kon mijozga kredit qarzdor")
                .isEqualByComparingTo("1000000");
        // Eski shinalar omborda qoladi — ular qaytarilmaydi
        assertThat(productRepository.findBySku("BU-205-55-R16-MICHELIN").orElseThrow().getQuantity())
                .isEqualTo(4);
    }

    // --- helpers ---

    private SaleRequest barterRequest(int usedQuantity, String unitValue, String paid) {
        return SaleRequest.builder()
                .customerId(customer.getId())
                .items(List.of(SaleItemRequest.builder()
                        .productId(newTire.getId())
                        .quantity(4)
                        .build()))
                .tradeInItems(List.of(TradeInItemRequest.builder()
                        .width(205).profile(55).diameter(16)
                        .brandName("Michelin")
                        .condition("protektor 60%")
                        .quantity(usedQuantity)
                        .unitValue(new BigDecimal(unitValue))
                        .resalePrice(new BigDecimal("250000"))
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

    private Customer reloadCustomer() {
        entityManager.flush();
        entityManager.clear();
        return customerRepository.findById(customer.getId()).orElseThrow();
    }

    private Sale reloadSale(Long id) {
        entityManager.flush();
        entityManager.clear();
        return saleRepository.findById(id).orElseThrow();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-barter");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }
}
