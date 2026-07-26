package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.dto.response.ProfitLossResponse;
import uz.shinamagazin.api.dto.response.SalesReportResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Sotuvlar hisoboti.
 *
 * <p>Ilgari qaytarishlar bu hisobotda umuman ko'rinmasdi va natija ikki xil
 * yo'l bilan buzilardi: to'liq qaytarilgan savdo REFUNDED bo'lgani uchun
 * hisobotdan butunlay yo'qolardi, qisman qaytarilgani esa to'liq summasi
 * bilan qolardi. Bundan tashqari savdo darajasidagi chegirma
 * ({@code sale.discountAmount}) foyda hisobida e'tiborga olinmasdi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:sales-report;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SalesReportTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;

    private ReportService service;
    private User cashier;
    private Product product;
    private int seq;

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 15);

    @BeforeEach
    void setUp() {
        saleReturnRepository.deleteAll();
        expenseRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        service = new ReportService(saleRepository, productRepository, stockMovementRepository,
                debtRepository, paymentRepository, expenseRepository, saleReturnRepository);
        cashier = userRepository.saveAndFlush(user());
        product = productRepository.saveAndFlush(product());
    }

    // ─── Qaytarishlar ───

    // Ilgari REFUNDED savdo `status == COMPLETED` filtridan o'tmasdi va
    // hisobotdan BUTUNLAY yo'qolardi — go'yo savdo hech bo'lmagandek.
    @Test
    @DisplayName("To'liq qaytarilgan savdo hisobotdan yo'qolmaydi")
    void fullyRefundedSaleStaysInReport() {
        Sale sale = sale(TODAY, 1, "1000000");
        saleReturn(sale, TODAY, 1, "1000000");
        sale.setStatus(SaleStatus.REFUNDED);
        saleRepository.saveAndFlush(sale);

        SalesReportResponse report = report();

        assertThat(report.getCompletedSalesCount())
                .as("savdo sodir bo'lgan — u alohida qaytarish bilan ayiriladi")
                .isEqualTo(1);
        assertThat(report.getTotalRevenue()).isEqualByComparingTo("1000000");
        assertThat(report.getReturnsTotal()).isEqualByComparingTo("1000000");
        assertThat(report.getNetRevenue()).isEqualByComparingTo("0");
    }

    // Ilgari qisman qaytarish savdoni COMPLETED holatida qoldirar edi, ya'ni
    // to'liq summa hisobga olinib, qaytarilgan qism hech qayerdan ayirilmasdi.
    @Test
    @DisplayName("Qisman qaytarish sof tushumdan ayiriladi")
    void partialReturnIsSubtracted() {
        Sale sale = sale(TODAY, 2, "2000000");
        saleReturn(sale, TODAY, 1, "1000000");

        SalesReportResponse report = report();

        assertThat(report.getTotalRevenue()).isEqualByComparingTo("2000000");
        assertThat(report.getReturnsTotal()).isEqualByComparingTo("1000000");
        assertThat(report.getNetRevenue()).isEqualByComparingTo("1000000");
        assertThat(report.getReturnsCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Bekor qilingan savdo tushumga kirmaydi, lekin sanaladi")
    void cancelledSaleIsExcludedButCounted() {
        sale(TODAY, 1, "1000000");
        Sale cancelled = sale(TODAY, 1, "9000000");
        cancelled.setStatus(SaleStatus.CANCELLED);
        saleRepository.saveAndFlush(cancelled);

        SalesReportResponse report = report();

        assertThat(report.getTotalRevenue()).isEqualByComparingTo("1000000");
        assertThat(report.getCompletedSalesCount()).isEqualTo(1);
        assertThat(report.getCancelledSalesCount()).isEqualTo(1);
        assertThat(report.getTotalSalesCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Qaytarish o'zi bo'lgan kunga yoziladi, savdo kuniga emas")
    void returnIsRecordedOnItsOwnDay() {
        Sale sale = sale(TODAY.minusDays(2), 1, "1000000");
        saleReturn(sale, TODAY, 1, "1000000");

        SalesReportResponse report = report();

        assertThat(report.getDailyData())
                .filteredOn(d -> d.getDate().equals(TODAY.minusDays(2).toString()))
                .singleElement()
                .satisfies(d -> {
                    assertThat(d.getRevenue()).isEqualByComparingTo("1000000");
                    assertThat(d.getReturns()).isEqualByComparingTo("0");
                });
        assertThat(report.getDailyData())
                .filteredOn(d -> d.getDate().equals(TODAY.toString()))
                .singleElement()
                .satisfies(d -> {
                    assertThat(d.getRevenue()).isEqualByComparingTo("0");
                    assertThat(d.getReturns()).isEqualByComparingTo("1000000");
                    assertThat(d.getNetRevenue()).isEqualByComparingTo("-1000000");
                });
    }

    // ─── Savdo darajasidagi chegirma ───
    // `totalAmount = subtotal − discountAmount`. Foyda qatorlar yig'indisidan
    // hisoblansa, bu chegirma umuman e'tiborga olinmasdi.

    @Test
    @DisplayName("Savdo darajasidagi chegirma tushum va foydani kamaytiradi")
    void saleLevelDiscountReducesRevenueAndProfit() {
        // Qatorlar: 2 000 000, savdoga qo'shimcha 200 000 chegirma → 1 800 000
        saleWithDiscount(TODAY, 2, "2000000", "200000");

        SalesReportResponse report = report();

        assertThat(report.getTotalRevenue())
                .as("mijoz aynan shuni to'laydi")
                .isEqualByComparingTo("1800000");
        assertThat(report.getTotalProfit())
                .as("1 800 000 − 2 × 700 000 tannarx")
                .isEqualByComparingTo("400000");
    }

    @Test
    @DisplayName("Savdo chegirmasi mahsulotlar kesimida ulushga qarab taqsimlanadi")
    void saleLevelDiscountIsAllocatedAcrossProducts() {
        saleWithDiscount(TODAY, 2, "2000000", "200000");

        assertThat(report().getTopProducts())
                .singleElement()
                .satisfies(p -> assertThat(p.getTotalRevenue())
                        .as("aks holda mahsulotlar yig'indisi savdo summasidan katta chiqardi")
                        .isEqualByComparingTo("1800000"));
    }

    // ─── Top ro'yxatlar ───

    @Test
    @DisplayName("Qaytarilgan tovar eng ko'p sotilganlar ro'yxatidan ayiriladi")
    void returnedItemsReduceTopProducts() {
        Sale sale = sale(TODAY, 5, "5000000");
        saleReturn(sale, TODAY, 3, "3000000");

        assertThat(report().getTopProducts())
                .singleElement()
                .satisfies(p -> {
                    assertThat(p.getQuantitySold())
                            .as("5 sotildi, 3 qaytdi")
                            .isEqualTo(2);
                    assertThat(p.getQuantityReturned()).isEqualTo(3);
                    assertThat(p.getTotalRevenue()).isEqualByComparingTo("2000000");
                });
    }

    @Test
    @DisplayName("Hammasini qaytargan mijoz eng yaxshi mijoz bo'lib qolmaydi")
    void refundingCustomerIsNotTopCustomer() {
        Customer big = customerRepository.saveAndFlush(customer("Katta xaridor", "+998901111111"));
        Customer small = customerRepository.saveAndFlush(customer("Kichik xaridor", "+998902222222"));

        Sale bigSale = sale(TODAY, 5, "5000000");
        bigSale.setCustomer(big);
        saleRepository.saveAndFlush(bigSale);
        saleReturn(bigSale, TODAY, 5, "5000000");

        Sale smallSale = sale(TODAY, 1, "1000000");
        smallSale.setCustomer(small);
        saleRepository.saveAndFlush(smallSale);

        assertThat(report().getTopCustomers())
                .first()
                .satisfies(c -> {
                    assertThat(c.getCustomerName()).isEqualTo("Kichik xaridor");
                    assertThat(c.getTotalSpent()).isEqualByComparingTo("1000000");
                });
    }

    // ─── Ikki hisobotning kelishuvi ───
    // Sotuvlar hisobotidagi foyda va P&L dagi yalpi foyda BIR XIL bo'lishi
    // kerak: aks holda foydalanuvchi ikki sahifada ikki xil raqam ko'rib,
    // qaysi biriga ishonishni bilmaydi.

    @Test
    @DisplayName("Sotuvlar hisobotidagi foyda P&L dagi yalpi foyda bilan bir xil")
    void profitMatchesProfitLossReport() {
        saleWithDiscount(TODAY, 3, "3000000", "150000");
        Sale second = sale(TODAY.minusDays(1), 2, "2000000");
        saleReturn(second, TODAY, 1, "1000000");

        SalesReportResponse sales = report();
        ProfitLossResponse pl = service.getProfitLoss(TODAY.minusDays(7), TODAY.plusDays(1));

        assertThat(sales.getTotalProfit()).isEqualByComparingTo(pl.getGrossProfit());
        assertThat(sales.getNetRevenue()).isEqualByComparingTo(pl.getNetRevenue());
        assertThat(sales.getReturnsTotal()).isEqualByComparingTo(pl.getReturns());
    }

    @Test
    @DisplayName("Teskari sana oralig'i rad etiladi")
    void reversedDateRangeIsRejected() {
        assertThatThrownBy(() -> service.getSalesReport(TODAY, TODAY.minusDays(1)))
                .isInstanceOf(BadRequestException.class);
    }

    // --- helpers ---

    private SalesReportResponse report() {
        return service.getSalesReport(TODAY.minusDays(7), TODAY.plusDays(1));
    }

    private Sale sale(LocalDate date, int quantity, String total) {
        return buildSale(date, quantity, total, total, "0");
    }

    private Sale saleWithDiscount(LocalDate date, int quantity, String subtotal, String discount) {
        String total = new BigDecimal(subtotal).subtract(new BigDecimal(discount)).toPlainString();
        return buildSale(date, quantity, subtotal, total, discount);
    }

    private Sale buildSale(LocalDate date, int quantity, String subtotal, String total, String discount) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++seq))
                .saleDate(date.atTime(12, 0))
                .subtotal(new BigDecimal(subtotal))
                .discountAmount(new BigDecimal(discount))
                .totalAmount(new BigDecimal(total))
                .paidAmount(new BigDecimal(total))
                .debtAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale = saleRepository.saveAndFlush(sale);

        sale.addItem(SaleItem.builder()
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal(subtotal).divide(BigDecimal.valueOf(quantity), 2, java.math.RoundingMode.HALF_UP))
                .discount(BigDecimal.ZERO)
                .totalPrice(new BigDecimal(subtotal))
                .costPrice(new BigDecimal("700000"))
                .build());
        return saleRepository.saveAndFlush(sale);
    }

    private void saleReturn(Sale sale, LocalDate date, int quantity, String refund) {
        SaleItem soldItem = saleRepository.findByIdWithItems(sale.getId()).orElseThrow()
                .getItems().get(0);

        SaleReturn saleReturn = SaleReturn.builder()
                .returnNumber("SR-" + (++seq))
                .sale(sale)
                .returnDate(date.atTime(15, 0))
                .refundAmount(new BigDecimal(refund))
                .debtReduced(BigDecimal.ZERO)
                .cashRefunded(new BigDecimal(refund))
                .createdBy(cashier)
                .build();
        saleReturn.addItem(SaleReturnItem.builder()
                .saleItem(soldItem)
                .product(soldItem.getProduct())
                .quantity(quantity)
                .unitPrice(new BigDecimal(refund).divide(BigDecimal.valueOf(quantity), 2, java.math.RoundingMode.HALF_UP))
                .totalPrice(new BigDecimal(refund))
                .build());
        saleReturnRepository.saveAndFlush(saleReturn);
    }

    private Product product() {
        Product p = new Product();
        p.setName("Shina");
        p.setSku("SKU-1");
        p.setSellingPrice(new BigDecimal("1000000"));
        p.setPurchasePrice(new BigDecimal("700000"));
        p.setQuantity(100);
        p.setMinStockLevel(5);
        p.setActive(true);
        return p;
    }

    private static Customer customer(String name, String phone) {
        Customer c = new Customer();
        c.setFullName(name);
        c.setPhone(phone);
        c.setBalance(BigDecimal.ZERO);
        return c;
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
}
