package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CreateSaleReturnRequest;
import uz.shinamagazin.api.dto.response.SaleReturnResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Savdo qaytarish.
 *
 * <p>`SALES_REFUND` ruxsati va `REFUNDED` status bor edi, lekin ularni
 * ishlatadigan metod yo'q edi. Bu testlar pul taqsimotini qulflaydi — u
 * yerda xato bo'lsa do'kon pul yo'qotadi yoki mijozga ortiqcha pul beriladi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:sale-returns;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SaleReturnServiceTest {

    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleItemRepository saleItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private uz.shinamagazin.api.repository.ExpenseRepository expenseRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    private SaleReturnService service;
    private User cashier;
    private Product product;
    private int seq;

    /** Hujjat raqami — H2'da `ON CONFLICT` yo'q, shuning uchun oddiy hisoblagich. */
    private static class SequentialNumbers extends DocumentNumberService {
        private int n = 0;
        @Override public String nextSaleReturnNumber() { return "SR-" + (++n); }
    }

    @BeforeEach
    void setUp() {
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        shiftRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(user());
        product = productRepository.saveAndFlush(product(10));
        seq = 0;

        CashShiftService shiftService =
                new CashShiftService(shiftRepository, userRepository, saleReturnRepository, expenseRepository);
        service = new SaleReturnService(saleReturnRepository, saleRepository, saleItemRepository,
                productRepository, stockMovementRepository, customerRepository, userRepository,
                new SequentialNumbers(), shiftService, debtRepository);
    }

    @Test
    @DisplayName("To'liq qaytarishda zaxira tiklanadi va savdo REFUNDED bo'ladi")
    void fullReturnRestoresStockAndMarksRefunded() {
        Sale sale = saleWithItem(2, "1000000", "2000000", "2000000", "0");
        int stockBefore = product.getQuantity();

        SaleReturnResponse ret = service.createReturn(sale.getId(), cashier.getId(), request(sale, 2));

        assertThat(ret.getRefundAmount()).isEqualByComparingTo("2000000");
        assertThat(reload(product).getQuantity()).isEqualTo(stockBefore + 2);
        assertThat(reload(sale).getStatus()).isEqualTo(SaleStatus.REFUNDED);
    }

    @Test
    @DisplayName("Qisman qaytarishda savdo REFUNDED bo'lmaydi")
    void partialReturnKeepsSaleCompleted() {
        Sale sale = saleWithItem(3, "1000000", "3000000", "3000000", "0");

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(reload(sale).getStatus()).isEqualTo(SaleStatus.COMPLETED);
    }

    // Pul taqsimotining mag'zi: qarzga olgan mijoz tovarni qaytarib, ustiga
    // naqd pul ham olib ketmasligi kerak.
    @Test
    @DisplayName("Qarzli savdoda avval qarz kamayadi, qolgani naqd qaytadi")
    void debtIsReducedBeforeCashIsPaidBack() {
        // 1 000 000 lik savdo: 400 000 to'langan, 600 000 qarz
        Sale sale = saleWithItem(1, "1000000", "1000000", "400000", "600000");

        SaleReturnResponse ret = service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(ret.getDebtReduced()).isEqualByComparingTo("600000");
        assertThat(ret.getCashRefunded())
                .as("faqat mijoz haqiqatan to'lagan qism naqd qaytariladi")
                .isEqualByComparingTo("400000");
        assertThat(reload(sale).getDebtAmount()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Qarzsiz savdoda hammasi naqd qaytadi")
    void fullyPaidSaleRefundsAllInCash() {
        Sale sale = saleWithItem(1, "500000", "500000", "500000", "0");

        SaleReturnResponse ret = service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(ret.getDebtReduced()).isEqualByComparingTo("0");
        assertThat(ret.getCashRefunded()).isEqualByComparingTo("500000");
    }

    @Test
    @DisplayName("Chegirmali qatorda mijoz to'lagan narx qaytariladi (katalog narxi emas)")
    void refundsDiscountedPriceNotListPrice() {
        // 2 dona × 1 000 000, qatorga 400 000 chegirma -> jami 1 600 000
        Sale sale = saleWithItem(2, "1000000", "1600000", "1600000", "0");

        SaleReturnResponse ret = service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(ret.getRefundAmount())
                .as("1 600 000 / 2 = 800 000, katalog narxi 1 000 000 emas")
                .isEqualByComparingTo("800000");
    }

    @Test
    @DisplayName("Sotilganidan ko'p qaytarib bo'lmaydi")
    void cannotReturnMoreThanSold() {
        Sale sale = saleWithItem(2, "1000000", "2000000", "2000000", "0");

        assertThatThrownBy(() -> service.createReturn(sale.getId(), cashier.getId(), request(sale, 3)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qaytarish mumkin bo'lgan miqdor");
    }

    // Ikki bosqichli qaytarishda umumiy miqdor tekshirilishi kerak: 2 dona
    // olgan mijoz 1 + 2 = 3 dona qaytara olmasligi kerak.
    @Test
    @DisplayName("Avvalgi qaytarishlar hisobga olinadi")
    void previousReturnsCountTowardTheLimit() {
        Sale sale = saleWithItem(2, "1000000", "2000000", "2000000", "0");
        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThatThrownBy(() -> service.createReturn(sale.getId(), cashier.getId(), request(sale, 2)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Ikki bosqichda to'liq qaytarilsa savdo REFUNDED bo'ladi")
    void twoPartialReturnsCompleteTheRefund() {
        Sale sale = saleWithItem(2, "1000000", "2000000", "2000000", "0");

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));
        assertThat(reload(sale).getStatus()).isEqualTo(SaleStatus.COMPLETED);

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));
        assertThat(reload(sale).getStatus()).isEqualTo(SaleStatus.REFUNDED);
    }

    @Test
    @DisplayName("Bekor qilingan savdodan qaytarib bo'lmaydi")
    void cannotReturnFromCancelledSale() {
        Sale sale = saleWithItem(1, "500000", "500000", "500000", "0");
        sale.setStatus(SaleStatus.CANCELLED);
        saleRepository.saveAndFlush(sale);

        assertThatThrownBy(() -> service.createReturn(sale.getId(), cashier.getId(), request(sale, 1)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bekor qilingan");
    }

    @Test
    @DisplayName("Zaxira harakati SALE_RETURN sifatida yoziladi")
    void recordsStockMovement() {
        Sale sale = saleWithItem(1, "500000", "500000", "500000", "0");

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(stockMovementRepository.findAll())
                .filteredOn(m -> "SALE_RETURN".equals(m.getReferenceType()))
                .singleElement()
                .satisfies(m -> {
                    assertThat(m.getMovementType()).isEqualTo(MovementType.IN);
                    assertThat(m.getQuantity()).isEqualTo(1);
                });
    }

    // ─── Savdo darajasidagi chegirma ───
    // `sale.discountAmount` (masalan "yaxlitladik") qatorlarda umuman
    // ko'rinmaydi. Uni hisobga olmaslik do'konga REAL ZARAR keltirardi:
    // mijoz chegirma bilan arzon olib, qaytarganda to'liq narxni olardi.

    @Test
    @DisplayName("To'liq qaytarishda mijoz AYNAN to'lagan summasini oladi")
    void fullReturnRefundsExactlyWhatWasPaid() {
        // Qatorlar 2 000 000, savdoga 200 000 chegirma → mijoz 1 800 000 to'ladi
        Sale sale = discountedSale(2, "1000000", "2000000", "1800000");

        SaleReturnResponse result = service.createReturn(sale.getId(), cashier.getId(), request(sale, 2));

        assertThat(result.getRefundAmount())
                .as("aks holda do'kon 200 000 zarar ko'rardi")
                .isEqualByComparingTo("1800000");
        assertThat(result.getCashRefunded()).isEqualByComparingTo("1800000");
    }

    @Test
    @DisplayName("Qisman qaytarishda chegirma ulushga qarab taqsimlanadi")
    void partialReturnAllocatesSaleDiscount() {
        Sale sale = discountedSale(2, "1000000", "2000000", "1800000");

        SaleReturnResponse result = service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        assertThat(result.getRefundAmount())
                .as("bitta donaga to'g'ri keladigan haqiqiy narx")
                .isEqualByComparingTo("900000");
    }

    @Test
    @DisplayName("Chegirmasiz savdoda summa o'zgarmaydi")
    void undiscountedSaleRefundsLineTotal() {
        Sale sale = saleWithItem(2, "1000000", "2000000", "2000000", "0");

        assertThat(service.createReturn(sale.getId(), cashier.getId(), request(sale, 2)).getRefundAmount())
                .isEqualByComparingTo("2000000");
    }

    @Test
    @DisplayName("Ikki bosqichli qaytarish jami savdo summasidan oshmaydi")
    void repeatedReturnsNeverExceedSaleTotal() {
        Sale sale = discountedSale(3, "1000000", "3000000", "2500000");

        BigDecimal first = service.createReturn(sale.getId(), cashier.getId(), request(sale, 2))
                .getRefundAmount();
        BigDecimal second = service.createReturn(sale.getId(), cashier.getId(), request(sale, 1))
                .getRefundAmount();

        assertThat(first.add(second))
                .as("yaxlitlash ham savdo summasidan oshirib yubormasligi kerak")
                .isLessThanOrEqualTo(new BigDecimal("2500000"));
        assertThat(reload(sale).getPaidAmount())
                .as("to'langan summa manfiyga tushmaydi")
                .isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    // ─── Qarz yozuvi sinxronligi ───
    // Ilgari qaytarish faqat `sale.debtAmount` ni kamaytirardi, `debts`
    // jadvalidagi qator esa to'liq summa bilan ACTIVE qolaverardi: eslatmalar
    // mijozni qaytarilgan tovar uchun ta'qib qilar, kassir bu "qarz"ni
    // undirib, do'kon ikkinchi marta pul olishi mumkin edi.

    @Test
    @DisplayName("To'liq qaytarishda qarz yozuvi ham yopiladi — fantom qarz qolmaydi")
    void fullReturnClosesDebtRecord() {
        Customer buyer = customerRepository.saveAndFlush(customer());
        Sale sale = saleFor(buyer, 1, "1000000", "1000000", "0", "1000000");
        Debt debt = debtFor(sale, "1000000");

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        Debt after = reloadDebt(debt);
        assertThat(after.getRemainingAmount()).isEqualByComparingTo("0");
        assertThat(after.getStatus()).isEqualTo(DebtStatus.CANCELLED);
    }

    @Test
    @DisplayName("Qisman qaytarishda qarz yozuvi mos summaga kamayadi, ACTIVE qoladi")
    void partialReturnReducesDebtRecord() {
        Customer buyer = customerRepository.saveAndFlush(customer());
        Sale sale = saleFor(buyer, 2, "1000000", "2000000", "0", "2000000");
        Debt debt = debtFor(sale, "2000000");

        service.createReturn(sale.getId(), cashier.getId(), request(sale, 1));

        Debt after = reloadDebt(debt);
        assertThat(after.getRemainingAmount()).isEqualByComparingTo("1000000");
        assertThat(after.getStatus()).isEqualTo(DebtStatus.ACTIVE);
    }

    // --- helpers ---

    /** Savdo darajasida chegirma berilgan savdo: {@code subtotal} > {@code totalAmount}. */
    private Sale discountedSale(int quantity, String unitPrice, String subtotal, String total) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++seq))
                .saleDate(LocalDateTime.now())
                .subtotal(new BigDecimal(subtotal))
                .discountAmount(new BigDecimal(subtotal).subtract(new BigDecimal(total)))
                .totalAmount(new BigDecimal(total))
                .paidAmount(new BigDecimal(total))
                .debtAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale.getItems().add(SaleItem.builder()
                .sale(sale)
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal(unitPrice))
                .discount(BigDecimal.ZERO)
                .totalPrice(new BigDecimal(subtotal))
                .build());
        return saleRepository.saveAndFlush(sale);
    }

    private CreateSaleReturnRequest request(Sale sale, int quantity) {
        Sale fresh = saleRepository.findByIdWithItems(sale.getId()).orElseThrow();
        CreateSaleReturnRequest.Item item = new CreateSaleReturnRequest.Item();
        item.setSaleItemId(fresh.getItems().get(0).getId());
        item.setQuantity(quantity);

        CreateSaleReturnRequest request = new CreateSaleReturnRequest();
        request.setItems(List.of(item));
        request.setReason("Mijoz qaytardi");
        return request;
    }

    private Sale saleWithItem(int quantity, String unitPrice, String total, String paid, String debt) {
        return saleFor(null, quantity, unitPrice, total, paid, debt);
    }

    private Sale saleFor(Customer customer, int quantity, String unitPrice, String total,
                         String paid, String debt) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++seq))
                .customer(customer)
                .saleDate(LocalDateTime.now())
                .subtotal(new BigDecimal(total))
                .totalAmount(new BigDecimal(total))
                .paidAmount(new BigDecimal(paid))
                .debtAmount(new BigDecimal(debt))
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(new BigDecimal(debt).signum() > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale.getItems().add(SaleItem.builder()
                .sale(sale)
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal(unitPrice))
                .discount(BigDecimal.ZERO)
                .totalPrice(new BigDecimal(total))
                .build());
        return saleRepository.saveAndFlush(sale);
    }

    private Debt debtFor(Sale sale, String amount) {
        return debtRepository.saveAndFlush(Debt.builder()
                .customer(sale.getCustomer())
                .sale(sale)
                .originalAmount(new BigDecimal(amount))
                .remainingAmount(new BigDecimal(amount))
                .dueDate(java.time.LocalDate.now().plusDays(30))
                .status(DebtStatus.ACTIVE)
                .build());
    }

    private Debt reloadDebt(Debt debt) {
        entityManager.flush();
        entityManager.clear();
        return debtRepository.findById(debt.getId()).orElseThrow();
    }

    private static Customer customer() {
        return Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998901112233")
                .build();
    }

    private <T> T reload(T entity) {
        entityManager.flush();
        entityManager.clear();
        if (entity instanceof Sale s) {
            return (T) saleRepository.findById(s.getId()).orElseThrow();
        }
        Product p = (Product) entity;
        return (T) productRepository.findById(p.getId()).orElseThrow();
    }

    private static User user() {
        User u = new User();
        u.setUsername("kassir");
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }

    private static Product product(int quantity) {
        return Product.builder()
                .sku("SKU-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("1000000"))
                .quantity(quantity)
                .active(true)
                .build();
    }
}
