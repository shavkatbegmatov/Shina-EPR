package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.dto.response.ProfitLossResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Foyda va zarar hisoboti (P&amp;L).
 *
 * <p>Bu testlar sof foyda arifmetikasini qulflaydi. Bu yerda xato bo'lsa
 * do'kon egasi zarar ko'rayotganini bilmay ishlayveradi — xarajatlar hisobga
 * olinmasa yalpi marja doim chiroyli ko'rinadi.
 *
 * <p>Servis haqiqiy repozitoriylar bilan quriladi: hisobning bir qismi SQL
 * guruhlashda (xarajatlar turkumi/sanasi), mock bilan tekshirish yetarli emas.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:profit-loss;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProfitLossReportTest {

    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
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
        userRepository.deleteAll();

        service = new ReportService(saleRepository, productRepository, stockMovementRepository,
                debtRepository, paymentRepository, expenseRepository, saleReturnRepository);
        cashier = userRepository.saveAndFlush(user());
        // seq NOLGA QAYTARILMAYDI: u SKU, hisob-faktura va qaytarish raqami
        // uchun umumiy hisoblagich, qayta boshlansa SKU takrorlanib ketardi.
        product = productRepository.saveAndFlush(product("700000"));
    }

    // ─── Yalpi foyda ───

    @Test
    @DisplayName("Yalpi foyda = tushum − tannarx")
    void grossProfitIsRevenueMinusCost() {
        sale(TODAY, item(2, "1000000", "700000", "2000000"));

        ProfitLossResponse pl = report();

        assertThat(pl.getRevenue()).isEqualByComparingTo("2000000");
        assertThat(pl.getCostOfGoodsSold()).isEqualByComparingTo("1400000");
        assertThat(pl.getGrossProfit()).isEqualByComparingTo("600000");
        assertThat(pl.getGrossMarginPercent()).isEqualByComparingTo("30.00");
    }

    // Eng oson yanglishadigan joy: eski kod `unitPrice` dan hisoblardi, ya'ni
    // chegirma berilgan savdolarda foyda OSHIB ko'rinardi.
    @Test
    @DisplayName("Chegirma foydani kamaytiradi (unitPrice emas, totalPrice hisoblanadi)")
    void discountReducesProfit() {
        // 2 × 1 000 000 = 2 000 000, chegirma 300 000 → 1 700 000
        sale(TODAY, item(2, "1000000", "700000", "1700000"));

        ProfitLossResponse pl = report();

        assertThat(pl.getRevenue()).isEqualByComparingTo("1700000");
        assertThat(pl.getCostOfGoodsSold()).isEqualByComparingTo("1400000");
        assertThat(pl.getGrossProfit())
                .as("chegirma to'g'ridan-to'g'ri foydadan chiqadi")
                .isEqualByComparingTo("300000");
    }

    // Tannarx savdo paytida muhrlanadi: ta'minotchi narxi keyin o'zgarsa
    // o'tgan davrning foydasi o'zgarmasligi kerak.
    @Test
    @DisplayName("Mahsulot xarid narxi o'zgarsa ham o'tgan savdo foydasi o'zgarmaydi")
    void profitUsesCostFrozenAtSaleTime() {
        sale(TODAY, item(1, "1000000", "700000", "1000000"));

        assertThat(report().getGrossProfit()).isEqualByComparingTo("300000");

        product.setPurchasePrice(new BigDecimal("950000"));
        productRepository.saveAndFlush(product);

        assertThat(report().getGrossProfit())
                .as("aks holda hisobot har kuni boshqacha chiqardi")
                .isEqualByComparingTo("300000");
    }

    @Test
    @DisplayName("Tannarxi noma'lum qatorlar alohida sanaladi")
    void itemsWithoutCostAreCounted() {
        Product noCost = productRepository.saveAndFlush(product(null));
        Sale sale = sale(TODAY, item(1, "1000000", "700000", "1000000"));
        addItem(sale, noCost, 1, "500000", null, "500000");

        ProfitLossResponse pl = report();

        assertThat(pl.getItemsWithoutCost())
                .as("UI buni ogohlantirish sifatida ko'rsatadi — yalpi foyda oshib chiqadi")
                .isEqualTo(1);
        assertThat(pl.getRevenue()).isEqualByComparingTo("1500000");
        assertThat(pl.getCostOfGoodsSold())
                .as("noma'lum tannarx nol deb olinadi, tushum esa to'liq qoladi")
                .isEqualByComparingTo("700000");
    }

    @Test
    @DisplayName("Bekor qilingan savdo hisobga olinmaydi")
    void cancelledSaleIsExcluded() {
        sale(TODAY, item(1, "1000000", "700000", "1000000"));
        Sale cancelled = sale(TODAY, item(1, "9000000", "700000", "9000000"));
        cancelled.setStatus(SaleStatus.CANCELLED);
        saleRepository.saveAndFlush(cancelled);

        assertThat(report().getRevenue()).isEqualByComparingTo("1000000");
    }

    // ─── Qaytarishlar ───

    @Test
    @DisplayName("Qaytarish tushumni ham, tannarxni ham kamaytiradi")
    void returnReducesBothRevenueAndCost() {
        Sale sale = sale(TODAY, item(2, "1000000", "700000", "2000000"));
        saleReturn(sale, TODAY, 1, "1000000", "700000");

        ProfitLossResponse pl = report();

        assertThat(pl.getRevenue()).isEqualByComparingTo("2000000");
        assertThat(pl.getReturns()).isEqualByComparingTo("1000000");
        assertThat(pl.getNetRevenue()).isEqualByComparingTo("1000000");
        assertThat(pl.getCostOfGoodsSold())
                .as("tovar omborga qaytdi — tannarxi sotilganlar tannarxidan chiqadi")
                .isEqualByComparingTo("700000");
        assertThat(pl.getGrossProfit())
                .as("bitta dona sotilgandagi foyda")
                .isEqualByComparingTo("300000");
    }

    // To'liq qaytarilgan savdo REFUNDED holatiga o'tadi. Uni tushumdan ham
    // chiqarib tashlansa, summa IKKI marta kamayardi.
    @Test
    @DisplayName("To'liq qaytarilgan (REFUNDED) savdo tushumdan ikki marta ayirilmaydi")
    void fullyRefundedSaleIsNotSubtractedTwice() {
        Sale sale = sale(TODAY, item(1, "1000000", "700000", "1000000"));
        saleReturn(sale, TODAY, 1, "1000000", "700000");
        sale.setStatus(SaleStatus.REFUNDED);
        saleRepository.saveAndFlush(sale);

        ProfitLossResponse pl = report();

        assertThat(pl.getNetRevenue()).isEqualByComparingTo("0");
        assertThat(pl.getCostOfGoodsSold()).isEqualByComparingTo("0");
        assertThat(pl.getGrossProfit()).isEqualByComparingTo("0");
    }

    // ─── Xarajatlar va sof foyda ───

    @Test
    @DisplayName("Sof foyda = yalpi foyda − xarajatlar")
    void netProfitSubtractsExpenses() {
        sale(TODAY, item(2, "1000000", "700000", "2000000"));   // yalpi foyda 600 000
        expense(TODAY, ExpenseCategory.RENT, "400000");
        expense(TODAY, ExpenseCategory.UTILITIES, "100000");

        ProfitLossResponse pl = report();

        assertThat(pl.getGrossProfit()).isEqualByComparingTo("600000");
        assertThat(pl.getTotalExpenses()).isEqualByComparingTo("500000");
        assertThat(pl.getNetProfit()).isEqualByComparingTo("100000");
        assertThat(pl.getExpensesCount()).isEqualTo(2);
    }

    // Butun funksiyaning mavjud bo'lish sababi: yalpi marja chiroyli, lekin
    // xarajatlardan keyin do'kon ZARARDA.
    @Test
    @DisplayName("Xarajat yalpi foydadan katta bo'lsa sof foyda MANFIY chiqadi")
    void netProfitCanBeNegative() {
        sale(TODAY, item(1, "1000000", "700000", "1000000"));   // yalpi foyda 300 000
        expense(TODAY, ExpenseCategory.SALARY, "5000000");

        ProfitLossResponse pl = report();

        assertThat(pl.getGrossProfit()).isPositive();
        assertThat(pl.getNetProfit())
                .as("yalpi marja bu haqiqatni yashirardi")
                .isEqualByComparingTo("-4700000");
        assertThat(pl.getNetMarginPercent()).isNegative();
    }

    @Test
    @DisplayName("Xarajatlar turkum bo'yicha, kamayish tartibida va ulush bilan")
    void expensesAreBrokenDownByCategory() {
        expense(TODAY, ExpenseCategory.RENT, "3000000");
        expense(TODAY, ExpenseCategory.SALARY, "6000000");
        expense(TODAY, ExpenseCategory.SALARY, "1000000");

        ProfitLossResponse pl = report();

        assertThat(pl.getExpensesByCategory()).hasSize(2);
        assertThat(pl.getExpensesByCategory().get(0))
                .satisfies(b -> {
                    assertThat(b.getCategory()).isEqualTo(ExpenseCategory.SALARY);
                    assertThat(b.getAmount()).isEqualByComparingTo("7000000");
                    assertThat(b.getCount()).isEqualTo(2);
                    assertThat(b.getPercent()).isEqualByComparingTo("70.00");
                });
    }

    @Test
    @DisplayName("Davrdan tashqaridagi xarajat hisobga olinmaydi")
    void expensesOutsideRangeAreIgnored() {
        expense(TODAY, ExpenseCategory.RENT, "500000");
        expense(TODAY.minusMonths(2), ExpenseCategory.RENT, "9000000");
        expense(TODAY.plusMonths(2), ExpenseCategory.RENT, "9000000");

        assertThat(report().getTotalExpenses()).isEqualByComparingTo("500000");
    }

    // Xarajat SODIR BO'LGAN sana bo'yicha yoziladi, tizimga kiritilgan payt
    // bo'yicha emas: kassir kechagi xarajatni ertalab kiritishi mumkin.
    @Test
    @DisplayName("Xarajat expenseDate bo'yicha kunga yoziladi")
    void expenseUsesExpenseDateNotCreationTime() {
        expense(TODAY.minusDays(1), ExpenseCategory.SUPPLIES, "250000");

        ProfitLossResponse pl = report();

        assertThat(pl.getDaily())
                .filteredOn(d -> d.getDate().equals(TODAY.minusDays(1).toString()))
                .singleElement()
                .satisfies(d -> assertThat(d.getExpenses()).isEqualByComparingTo("250000"));
    }

    // ─── Kunlik dinamika va chegaraviy holatlar ───

    @Test
    @DisplayName("Kunlik qatorlar butun oraliqni qoplaydi, savdosiz kunlar ham")
    void dailyCoversEveryDayInRange() {
        sale(TODAY, item(1, "1000000", "700000", "1000000"));

        ProfitLossResponse pl = service.getProfitLoss(TODAY.minusDays(2), TODAY);

        assertThat(pl.getDaily()).hasSize(3);
        assertThat(pl.getDaily().get(0).getRevenue()).isEqualByComparingTo("0");
        assertThat(pl.getDaily().get(2))
                .satisfies(d -> {
                    assertThat(d.getRevenue()).isEqualByComparingTo("1000000");
                    assertThat(d.getGrossProfit()).isEqualByComparingTo("300000");
                });
    }

    @Test
    @DisplayName("Kunlik sof foyda o'sha kunning xarajatini ayiradi")
    void dailyNetProfitSubtractsSameDayExpenses() {
        sale(TODAY, item(1, "1000000", "700000", "1000000"));
        expense(TODAY, ExpenseCategory.RENT, "100000");

        assertThat(report().getDaily())
                .filteredOn(d -> d.getDate().equals(TODAY.toString()))
                .singleElement()
                .satisfies(d -> assertThat(d.getNetProfit()).isEqualByComparingTo("200000"));
    }

    @Test
    @DisplayName("Ma'lumot yo'q davr nol qaytaradi, nolga bo'lish xatosisiz")
    void emptyPeriodReturnsZeros() {
        ProfitLossResponse pl = report();

        assertThat(pl.getRevenue()).isEqualByComparingTo("0");
        assertThat(pl.getNetProfit()).isEqualByComparingTo("0");
        assertThat(pl.getGrossMarginPercent()).isEqualByComparingTo("0");
        assertThat(pl.getNetMarginPercent()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Teskari sana oralig'i rad etiladi")
    void reversedDateRangeIsRejected() {
        assertThatThrownBy(() -> service.getProfitLoss(TODAY, TODAY.minusDays(1)))
                .isInstanceOf(BadRequestException.class);
    }

    // --- helpers ---

    private ProfitLossResponse report() {
        return service.getProfitLoss(TODAY.minusDays(7), TODAY.plusDays(1));
    }

    private record ItemSpec(int quantity, String unitPrice, String costPrice, String totalPrice) {}

    private static ItemSpec item(int quantity, String unitPrice, String costPrice, String totalPrice) {
        return new ItemSpec(quantity, unitPrice, costPrice, totalPrice);
    }

    private Sale sale(LocalDate date, ItemSpec spec) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++seq))
                .saleDate(date.atTime(12, 0))
                .subtotal(new BigDecimal(spec.totalPrice()))
                .totalAmount(new BigDecimal(spec.totalPrice()))
                .paidAmount(new BigDecimal(spec.totalPrice()))
                .debtAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .build();
        sale = saleRepository.saveAndFlush(sale);
        addItem(sale, product, spec.quantity(), spec.unitPrice(), spec.costPrice(), spec.totalPrice());
        return sale;
    }

    private SaleItem addItem(Sale sale, Product forProduct, int quantity,
                             String unitPrice, String costPrice, String totalPrice) {
        SaleItem item = SaleItem.builder()
                .product(forProduct)
                .quantity(quantity)
                .unitPrice(new BigDecimal(unitPrice))
                .discount(BigDecimal.ZERO)
                .totalPrice(new BigDecimal(totalPrice))
                .costPrice(costPrice == null ? null : new BigDecimal(costPrice))
                .build();
        sale.addItem(item);
        saleRepository.saveAndFlush(sale);
        return item;
    }

    private void saleReturn(Sale sale, LocalDate date, int quantity, String refund, String unitCost) {
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
                .unitPrice(new BigDecimal(unitCost))
                .totalPrice(new BigDecimal(refund))
                .build());
        saleReturnRepository.saveAndFlush(saleReturn);
    }

    private void expense(LocalDate date, ExpenseCategory category, String amount) {
        expenseRepository.saveAndFlush(Expense.builder()
                .expenseDate(date)
                .category(category)
                .amount(new BigDecimal(amount))
                .paymentMethod(PaymentMethod.CASH)
                .createdBy(cashier)
                .build());
    }

    private Product product(String purchasePrice) {
        Product p = new Product();
        p.setName("Shina " + (++seq));
        p.setSku("SKU-" + seq);
        p.setSellingPrice(new BigDecimal("1000000"));
        p.setPurchasePrice(purchasePrice == null ? null : new BigDecimal(purchasePrice));
        p.setQuantity(100);
        p.setMinStockLevel(5);
        p.setActive(true);
        return p;
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
