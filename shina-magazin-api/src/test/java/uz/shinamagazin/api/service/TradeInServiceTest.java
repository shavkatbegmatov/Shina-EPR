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
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.enums.TradeInStatus;
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
 * Barter: eski shinani qabul qilish va uni savdoda hisobga olish.
 *
 * <p>Asosiy qoida shu testlarda qulflanadi: barter summasi savdoning
 * QIYMATINI kamaytirmaydi (tushum hisoboti to'g'ri qolishi kerak), faqat
 * to'lanishi kerak bo'lgan summani kamaytiradi. Ya'ni 900 000 lik savdoda
 * 200 000 lik barter bo'lsa: {@code totalAmount=900000},
 * {@code tradeInAmount=200000}, kassaga tushadigan pul 700 000.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:trade-in;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TradeInServiceTest {

    @Autowired private TradeInRepository tradeInRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private StockMovementRepository stockMovementRepository;

    private TradeInService tradeInService;
    private SaleService saleService;
    private User cashier;
    private Customer customer;
    /** Sotiladigan yangi shina. */
    private Product newTire;
    /** B/U kartochka — barter shu yerga kirim qilinadi. */
    private Product usedTire;

    /** H2'da {@code ON CONFLICT} yo'q, shuning uchun oddiy hisoblagich. */
    private static class SequentialNumbers extends DocumentNumberService {
        private int tradeIn = 0;
        private int invoice = 0;
        @Override public String nextTradeInNumber() { return "TI-" + (++tradeIn); }
        @Override public String nextInvoiceNumber() { return "INV-TI-" + (++invoice); }
    }

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        tradeInRepository.deleteAll();
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        customer = customerRepository.saveAndFlush(Customer.builder()
                .fullName("Barter mijoz")
                .phone("+998901112233")
                .build());
        newTire = productRepository.saveAndFlush(product("SKU-NEW", "Michelin Primacy 4",
                new BigDecimal("900000"), 10));
        usedTire = productRepository.saveAndFlush(product("SKU-USED", "B/U 205/55 R16",
                new BigDecimal("350000"), 0));

        CashShiftService shifts = mock(CashShiftService.class);
        when(shifts.findOpenShift(any())).thenReturn(Optional.empty());
        DocumentNumberService numbers = new SequentialNumbers();

        tradeInService = new TradeInService(tradeInRepository, productRepository,
                customerRepository, userRepository, stockMovementRepository, numbers, shifts);

        saleService = new SaleService(saleRepository, productRepository, customerRepository,
                userRepository, debtRepository, stockMovementRepository, saleReturnRepository,
                mock(StaffNotificationService.class), mock(NotificationService.class),
                mock(SettingsService.class), numbers, shifts, tradeInService);

        CustomUserDetails principal = new CustomUserDetails(cashier);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Qabul qilingan shina omborga kiradi va bo'sh kartochkaga tannarx yoziladi")
    void acceptIncreasesStock() {
        TradeInResponse response = tradeInService.accept(tradeInRequest(2, "100000"), cashier.getId());

        assertThat(response.getStatus()).isEqualTo(TradeInStatus.NEW);
        assertThat(response.getTotalAmount()).isEqualByComparingTo("200000");

        Product reloaded = productRepository.findById(usedTire.getId()).orElseThrow();
        assertThat(reloaded.getQuantity()).isEqualTo(2);
        // Kartochka bo'sh edi — tannarx baholangan summadan olinadi
        assertThat(reloaded.getPurchasePrice()).isEqualByComparingTo("100000");

        List<StockMovement> movements = stockMovementRepository.findAll();
        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getReferenceType()).isEqualTo("TRADE_IN");
        assertThat(movements.get(0).getQuantity()).isEqualTo(2);
    }

    @Test
    @DisplayName("Kartochkada tovar bor bo'lsa tannarx TEGILMAYDI")
    void acceptKeepsExistingCost() {
        usedTire.setQuantity(4);
        usedTire.setPurchasePrice(new BigDecimal("250000"));
        productRepository.saveAndFlush(usedTire);

        tradeInService.accept(tradeInRequest(1, "50000"), cashier.getId());

        Product reloaded = productRepository.findById(usedTire.getId()).orElseThrow();
        assertThat(reloaded.getQuantity()).isEqualTo(5);
        // Bitta arzon baholangan shina butun qoldiqning tannarxini tushirmasligi kerak
        assertThat(reloaded.getPurchasePrice()).isEqualByComparingTo("250000");
    }

    @Test
    @DisplayName("Savdoda barter: qiymat 900 000 bo'lib qoladi, kassaga 700 000 tushadi")
    void tradeInReducesOnlyAmountDue() {
        SaleRequest request = saleRequest("700000");
        request.setTradeIn(tradeInRequest(1, "200000"));

        SaleResponse response = saleService.createSale(request);

        assertThat(response.getTotalAmount()).isEqualByComparingTo("900000");
        assertThat(response.getTradeInAmount()).isEqualByComparingTo("200000");
        assertThat(response.getPaidAmount()).isEqualByComparingTo("700000");
        assertThat(response.getDebtAmount()).isEqualByComparingTo("0");
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);

        // Hujjat savdoga bog'landi
        assertThat(tradeInRepository.findBySaleId(response.getId()).orElseThrow().getStatus())
                .isEqualTo(TradeInStatus.APPLIED);
    }

    @Test
    @DisplayName("To'lov barterdan keyingi summadan oshmaydi — ortiqchasi qaytim, tushum emas")
    void paidAmountIsClampedToAmountDue() {
        SaleRequest request = saleRequest("1000000");
        request.setTradeIn(tradeInRequest(1, "200000"));

        SaleResponse response = saleService.createSale(request);

        assertThat(response.getPaidAmount()).isEqualByComparingTo("700000");
        assertThat(response.getDebtAmount()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Qisman to'lovda qarz barterdan keyingi summadan hisoblanadi")
    void debtIsComputedAfterTradeIn() {
        // Qarzga sotish mijozsiz bo'lmaydi
        SaleRequest request = saleRequest("500000");
        request.setCustomerId(customer.getId());
        request.setTradeIn(tradeInRequest(1, "200000"));

        SaleResponse response = saleService.createSale(request);

        // 900 000 - 200 000 = 700 000 to'lanishi kerak, 500 000 to'landi
        assertThat(response.getDebtAmount()).isEqualByComparingTo("200000");
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIAL);
    }

    @Test
    @DisplayName("Barter savdo summasidan katta bo'lsa savdo rad etiladi")
    void tradeInCannotExceedTotal() {
        SaleRequest request = saleRequest("0");
        request.setTradeIn(tradeInRequest(1, "1200000"));

        assertThatThrownBy(() -> saleService.createSale(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("katta bo'lishi mumkin emas");
    }

    @Test
    @DisplayName("Bitta barter ikki savdoda ishlatilmaydi")
    void tradeInIsSingleUse() {
        TradeInResponse accepted = tradeInService.accept(tradeInRequest(1, "200000"), cashier.getId());

        SaleRequest first = saleRequest("700000");
        first.setTradeInId(accepted.getId());
        saleService.createSale(first);

        SaleRequest second = saleRequest("700000");
        second.setTradeInId(accepted.getId());

        assertThatThrownBy(() -> saleService.createSale(second))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon ishlatilgan");
    }

    @Test
    @DisplayName("Barterni ham tanlab, ham yangi qabul qilib bo'lmaydi")
    void inlineAndExistingAreMutuallyExclusive() {
        TradeInResponse accepted = tradeInService.accept(tradeInRequest(1, "100000"), cashier.getId());

        SaleRequest request = saleRequest("700000");
        request.setTradeInId(accepted.getId());
        request.setTradeIn(tradeInRequest(1, "200000"));

        assertThatThrownBy(() -> saleService.createSale(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bir vaqtda");
    }

    @Test
    @DisplayName("Savdo bekor qilinsa eski shinalar ombordan chiqadi va hujjat bekor bo'ladi")
    void cancellingSaleReversesTradeIn() {
        // To'lovsiz savdo: `cancelSale` pul olingan savdoni rad etadi
        SaleRequest request = saleRequest("0");
        request.setCustomerId(customer.getId());
        request.setTradeIn(tradeInRequest(2, "100000"));
        SaleResponse sale = saleService.createSale(request);

        assertThat(productRepository.findById(usedTire.getId()).orElseThrow().getQuantity()).isEqualTo(2);

        saleService.cancelSale(sale.getId());

        assertThat(productRepository.findById(usedTire.getId()).orElseThrow().getQuantity()).isZero();
        assertThat(tradeInRepository.findBySaleId(sale.getId()).orElseThrow().getStatus())
                .isEqualTo(TradeInStatus.CANCELLED);
    }

    @Test
    @DisplayName("Savdoda ishlatilgan barterni alohida bekor qilib bo'lmaydi")
    void appliedTradeInCannotBeCancelledDirectly() {
        SaleRequest request = saleRequest("700000");
        request.setTradeIn(tradeInRequest(1, "200000"));
        SaleResponse sale = saleService.createSale(request);

        Long tradeInId = tradeInRepository.findBySaleId(sale.getId()).orElseThrow().getId();

        assertThatThrownBy(() -> tradeInService.cancel(tradeInId, cashier.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("avval savdoni bekor qiling");
    }

    @Test
    @DisplayName("Ishlatilmagan barter bekor qilinsa kirim qaytariladi")
    void cancelReversesStock() {
        TradeInResponse accepted = tradeInService.accept(tradeInRequest(3, "80000"), cashier.getId());
        assertThat(productRepository.findById(usedTire.getId()).orElseThrow().getQuantity()).isEqualTo(3);

        tradeInService.cancel(accepted.getId(), cashier.getId());

        assertThat(productRepository.findById(usedTire.getId()).orElseThrow().getQuantity()).isZero();
        assertThat(tradeInRepository.findById(accepted.getId()).orElseThrow().getStatus())
                .isEqualTo(TradeInStatus.CANCELLED);
    }

    // --- helpers ---

    /** Bitta yangi shina (900 000) sotiladi, {@code paid} to'lanadi. */
    private SaleRequest saleRequest(String paid) {
        return SaleRequest.builder()
                .items(List.of(SaleItemRequest.builder()
                        .productId(newTire.getId())
                        .quantity(1)
                        .build()))
                .paidAmount(new BigDecimal(paid))
                .paymentMethod(PaymentMethod.CASH)
                .build();
    }

    private TradeInRequest tradeInRequest(int quantity, String unitValue) {
        return TradeInRequest.builder()
                .items(List.of(TradeInItemRequest.builder()
                        .productId(usedTire.getId())
                        .quantity(quantity)
                        .unitValue(new BigDecimal(unitValue))
                        .conditionNote("protektor 60%")
                        .build()))
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir-trade-in");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }

    private static Product product(String sku, String name, BigDecimal price, int quantity) {
        return Product.builder()
                .sku(sku)
                .name(name)
                .sellingPrice(price)
                .quantity(quantity)
                .active(true)
                .build();
    }
}
