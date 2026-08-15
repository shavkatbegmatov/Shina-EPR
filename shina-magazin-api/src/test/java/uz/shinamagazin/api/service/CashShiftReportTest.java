package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.dto.request.CloseShiftRequest;
import uz.shinamagazin.api.dto.request.CreateSaleReturnRequest;
import uz.shinamagazin.api.dto.request.OpenShiftRequest;
import uz.shinamagazin.api.dto.response.ZReportResponse;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.entity.Expense;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.SaleItem;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.CashShiftRepository;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.repository.ExpenseRepository;
import uz.shinamagazin.api.repository.PaymentRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.SaleItemRepository;
import uz.shinamagazin.api.repository.SaleRepository;
import uz.shinamagazin.api.repository.SaleReturnRepository;
import uz.shinamagazin.api.repository.StockMovementRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Z-hisobot — smena yakuni.
 *
 * <p>Muammo shu edi: kassir kun oxirida qancha pul topshirishi kerakligini
 * tizim bilmasdi. Bu testlar naqd hisobining aynan qaysi summalardan
 * yig'ilishini qulflaydi — bu yerda xato bo'lsa kamomad noto'g'ri
 * hisoblanadi va kassirga adolatsiz da'vo qo'yilishi mumkin.
 *
 * <p>Servis haqiqiy repozitoriylar bilan quriladi: hisob mantig'ining yarmi
 * SQL guruhlashda, shuning uchun mock bilan tekshirish yetarli emas.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:cash-shift;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CashShiftReportTest {

    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private SaleItemRepository saleItemRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private DebtRepository debtRepository;
    @Autowired private PaymentRepository paymentRepository;

    private CashShiftService service;
    private SaleReturnService returnService;
    private User cashier;
    private Product product;
    private int invoiceSeq;

    /** Hujjat raqami — H2'da `ON CONFLICT` yo'q, shuning uchun oddiy hisoblagich. */
    private static class SequentialNumbers extends DocumentNumberService {
        private int n = 0;
        @Override public String nextSaleReturnNumber() { return "SR-" + (++n); }
    }

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        paymentRepository.deleteAll();
        debtRepository.deleteAll();
        saleReturnRepository.deleteAll();
        expenseRepository.deleteAll();
        saleRepository.deleteAll();
        productRepository.deleteAll();
        shiftRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        service = new CashShiftService(shiftRepository, userRepository, saleReturnRepository,
                expenseRepository, paymentRepository);
        // Qaytarimlar REAL servis orqali yuradi: u paidAmount'ni ham kamaytiradi.
        // Repository bilan qo'lda qurilgan qaytarim bu mutatsiyani chetlab o'tib,
        // ikki marta ayirish xatosini yashirgan edi.
        returnService = new SaleReturnService(saleReturnRepository, saleRepository, saleItemRepository,
                productRepository, stockMovementRepository, customerRepository, userRepository,
                new SequentialNumbers(), service, debtRepository);
        cashier = userRepository.saveAndFlush(user("kassir"));
        product = productRepository.saveAndFlush(product());
        invoiceSeq = 0;
    }

    @Test
    @DisplayName("Naqd savdo kutilgan kassaga qo'shiladi")
    void cashSaleAddsToExpectedCash() {
        CashShift shift = openShift("100000");
        sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);

        ZReportResponse report = service.getReport(shift.getId());

        assertThat(report.getCashReceived()).isEqualByComparingTo("500000");
        assertThat(report.getExpectedCash())
                .as("boshlang'ich qoldiq + naqd tushum")
                .isEqualByComparingTo("600000");
    }

    // Eng oson yanglishadigan joy: qarzga sotilganda kassaga TO'LANGAN qism
    // tushadi, savdo summasi emas.
    @Test
    @DisplayName("Qisman to'langan naqd savdodan faqat to'langan qism kassaga tushadi")
    void partiallyPaidCashSaleOnlyCountsPaidPart() {
        CashShift shift = openShift("0");
        sale(shift, PaymentMethod.CASH, "1000000", "400000", "600000", SaleStatus.COMPLETED);

        ZReportResponse report = service.getReport(shift.getId());

        assertThat(report.getCashReceived()).isEqualByComparingTo("400000");
        assertThat(report.getDebtIssued()).isEqualByComparingTo("600000");
        assertThat(report.getGrossTotal())
                .as("savdo summasi to'liq ko'rsatiladi")
                .isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("Karta to'lovi kassaga tushmaydi")
    void cardSaleDoesNotAffectCash() {
        CashShift shift = openShift("50000");
        sale(shift, PaymentMethod.CARD, "800000", "800000", "0", SaleStatus.COMPLETED);

        ZReportResponse report = service.getReport(shift.getId());

        assertThat(report.getCashReceived()).isEqualByComparingTo("0");
        assertThat(report.getExpectedCash()).isEqualByComparingTo("50000");
        assertThat(report.getGrossTotal()).isEqualByComparingTo("800000");
    }

    @Test
    @DisplayName("Bekor qilingan savdo hisobga olinmaydi, lekin alohida sanaladi")
    void cancelledSaleIsExcludedButCounted() {
        CashShift shift = openShift("0");
        sale(shift, PaymentMethod.CASH, "300000", "300000", "0", SaleStatus.COMPLETED);
        sale(shift, PaymentMethod.CASH, "999000", "999000", "0", SaleStatus.CANCELLED);

        ZReportResponse report = service.getReport(shift.getId());

        assertThat(report.getSalesCount()).isEqualTo(1);
        assertThat(report.getCancelledCount()).isEqualTo(1);
        assertThat(report.getCashReceived())
                .as("bekor qilingan savdo kassaga pul keltirmagan")
                .isEqualByComparingTo("300000");
    }

    @Test
    @DisplayName("To'lov usullari bo'yicha taqsimot")
    void breaksDownByPaymentMethod() {
        CashShift shift = openShift("0");
        sale(shift, PaymentMethod.CASH, "100000", "100000", "0", SaleStatus.COMPLETED);
        sale(shift, PaymentMethod.CASH, "200000", "200000", "0", SaleStatus.COMPLETED);
        sale(shift, PaymentMethod.CARD, "300000", "300000", "0", SaleStatus.COMPLETED);

        ZReportResponse report = service.getReport(shift.getId());

        assertThat(report.getByPaymentMethod()).hasSize(2);
        assertThat(report.getSalesCount()).isEqualTo(3);
        assertThat(report.getByPaymentMethod())
                .filteredOn(b -> b.getMethod() == PaymentMethod.CASH)
                .singleElement()
                .satisfies(b -> {
                    assertThat(b.getCount()).isEqualTo(2);
                    assertThat(b.getTotal()).isEqualByComparingTo("300000");
                });
    }

    @Test
    @DisplayName("Boshqa smenaning savdolari aralashmaydi")
    void otherShiftSalesAreNotCounted() {
        CashShift first = openShift("0");
        sale(first, PaymentMethod.CASH, "100000", "100000", "0", SaleStatus.COMPLETED);
        service.closeShift(cashier.getId(), close("100000", null));

        CashShift second = openShift("0");
        sale(second, PaymentMethod.CASH, "700000", "700000", "0", SaleStatus.COMPLETED);

        assertThat(service.getReport(second.getId()).getCashReceived()).isEqualByComparingTo("700000");
        assertThat(service.getReport(first.getId()).getCashReceived()).isEqualByComparingTo("100000");
    }

    // ─── Qaytarimlar ───
    // Qaytarishda kassadan pul CHIQADI — ayirmasa kassirga asossiz kamomad
    // yozilardi. Lekin createReturn NAQD savdoning paidAmount'ini HAM
    // kamaytiradi, shuning uchun shu smenadagi savdoning qaytarimi
    // cashReceived'da allaqachon aks etgan bo'ladi: uni cashRefunded orqali
    // yana ayirish qaytarimni IKKI MARTA hisoblab, halol kassirga soxta
    // "ortiqcha", insofsiziga esa aynan shu summadagi o'g'irlikka niqob
    // berardi. Testlar shuning uchun REAL createReturn orqali yuradi.

    @Test
    @DisplayName("Naqd qaytarish kutilgan kassani BIR marta kamaytiradi")
    void cashRefundReducesExpectedCash() {
        CashShift shift = openShift("100000");
        Sale sold = soldWithItem(shift, PaymentMethod.CASH, "50000", 10, "500000", "0");

        assertThat(service.getReport(shift.getId()).getExpectedCash()).isEqualByComparingTo("600000");

        returnService.createReturn(sold.getId(), cashier.getId(), returnOf(sold, 3));

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashRefunded()).isEqualByComparingTo("150000");
        assertThat(report.getReturnsCount()).isEqualTo(1);
        assertThat(report.getExpectedCash())
                .as("kassada fizik: 100 000 + 500 000 − 150 000")
                .isEqualByComparingTo("450000");
    }

    @Test
    @DisplayName("Shu smenada to'liq naqd qaytarim: kassa boshlang'ich holatga qaytadi, minusga emas")
    void sameShiftFullRefundBalancesToFloat() {
        CashShift shift = openShift("0");
        Sale sold = soldWithItem(shift, PaymentMethod.CASH, "500000", 1, "500000", "0");

        returnService.createReturn(sold.getId(), cashier.getId(), returnOf(sold, 1));

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashRefunded()).isEqualByComparingTo("500000");
        assertThat(report.getExpectedCash())
                .as("500 000 kirdi, 500 000 chiqdi — ilgari −500 000 chiqib, kassir "
                        + "aynan shu summani o'zlashtirsa farq 0 bo'lib qolardi")
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("KARTA savdoning naqd qaytarimi kassadan to'liq ayiriladi")
    void cardSaleCashRefundStillReducesExpectedCash() {
        CashShift shift = openShift("500000");
        Sale sold = soldWithItem(shift, PaymentMethod.CARD, "500000", 1, "500000", "0");

        returnService.createReturn(sold.getId(), cashier.getId(), returnOf(sold, 1));

        assertThat(service.getReport(shift.getId()).getExpectedCash())
                .as("karta puli kassada emas, qaytarim esa kassadan chiqdi")
                .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Boshqa smenada qilingan savdoning qaytarimi shu smenadan ayiriladi")
    void crossShiftRefundIsSubtractedFromRefundingShift() {
        CashShift first = openShift("0");
        Sale sold = soldWithItem(first, PaymentMethod.CASH, "500000", 1, "500000", "0");
        service.closeShift(cashier.getId(), close("500000", null));

        CashShift second = openShift("600000");
        returnService.createReturn(sold.getId(), cashier.getId(), returnOf(sold, 1));

        assertThat(service.getReport(second.getId()).getExpectedCash())
                .as("pul ikkinchi smenaning kassasidan chiqdi")
                .isEqualByComparingTo("100000");
        assertThat(shiftRepository.findById(first.getId()))
                .get()
                .satisfies(s -> assertThat(s.getExpectedCash())
                        .as("yopilgan smenaning saqlangan hisobi o'zgarmaydi")
                        .isEqualByComparingTo("500000"));
    }

    // ─── Qarz to'lovlari ───
    // Payment endi qabul qilgan smenaga bog'lanadi. Ilgari kassaga tushgan
    // naqd qarz to'lovi expectedCash'da ko'rinmas edi (o'zlashtirish
    // aniqlanmasdi); sale.paidAmount mutatsiyasi esa pulni SOTUV smenasiga
    // yozib, u yerda fantom tushum yasardi.

    @Test
    @DisplayName("Shu smenada qabul qilingan naqd qarz to'lovi kutilgan kassaga qo'shiladi")
    void cashDebtPaymentReceivedInShiftIncreasesExpectedCash() {
        CashShift shift = openShift("0");
        // 1 000 000 lik naqd savdo: 400 000 to'langan, 600 000 qarz
        Sale sold = sale(shift, PaymentMethod.CASH, "1000000", "400000", "600000", SaleStatus.COMPLETED);

        debtPayment(shift, sold, PaymentMethod.CASH, "600000");

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashDebtPayments()).isEqualByComparingTo("600000");
        assertThat(report.getDebtPaymentsCount()).isEqualTo(1);
        assertThat(report.getExpectedCash())
                .as("kassada fizik: 400 000 (savdo) + 600 000 (qarz to'lovi)")
                .isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("Boshqa smenada qabul qilingan qarz to'lovi SOTUV smenasiga fantom tushum bermaydi")
    void crossShiftDebtPaymentCountsOnlyInReceivingShift() {
        CashShift first = openShift("0");
        Sale sold = sale(first, PaymentMethod.CASH, "1000000", "400000", "600000", SaleStatus.COMPLETED);
        service.closeShift(cashier.getId(), close("400000", null));

        CashShift second = openShift("0");
        debtPayment(second, sold, PaymentMethod.CASH, "600000");

        assertThat(service.getReport(second.getId()).getExpectedCash())
                .as("pul ikkinchi smenaning kassasiga tushdi")
                .isEqualByComparingTo("600000");
        assertThat(service.getReport(first.getId()).getExpectedCash())
                .as("sotuv smenasi keyin kelgan pulni ko'rmasligi kerak — u boshqa kassada")
                .isEqualByComparingTo("400000");
    }

    @Test
    @DisplayName("KARTA bilan to'langan qarz kassaga tushmaydi")
    void cardDebtPaymentDoesNotEnterDrawer() {
        CashShift shift = openShift("0");
        Sale sold = sale(shift, PaymentMethod.CASH, "1000000", "400000", "600000", SaleStatus.COMPLETED);

        debtPayment(shift, sold, PaymentMethod.CARD, "600000");

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashDebtPayments()).isEqualByComparingTo("0");
        assertThat(report.getExpectedCash())
                .as("karta puli terminalda — kassada faqat savdoning 400 000 tasi")
                .isEqualByComparingTo("400000");
    }

    @Test
    @DisplayName("Qarzdan qaytarilgan qism kassaga ta'sir qilmaydi")
    void debtOnlyRefundDoesNotAffectCash() {
        CashShift shift = openShift("200000");
        // To'liq nasiyaga sotilgan: qaytarimda pul kassadan chiqmaydi, qarz kamayadi
        Sale sold = soldWithItem(shift, PaymentMethod.CASH, "500000", 1, "0", "500000");

        returnService.createReturn(sold.getId(), cashier.getId(), returnOf(sold, 1));

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashRefunded()).isEqualByComparingTo("0");
        assertThat(report.getExpectedCash())
                .as("kassadan pul chiqmagan")
                .isEqualByComparingTo("200000");
    }

    // ─── Naqd xarajatlar ───
    // Kassir kassadan pul olib xarajat qilishi mumkin (suv, kanselyariya).
    // Buni ayirmasa kassa kam chiqib, unga asossiz kamomad yozilardi.

    @Test
    @DisplayName("Naqd xarajat kutilgan kassani kamaytiradi")
    void cashExpenseReducesExpectedCash() {
        CashShift shift = openShift("100000");
        sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);

        expenseRepository.saveAndFlush(expense(shift, PaymentMethod.CASH, "80000"));

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashExpenses()).isEqualByComparingTo("80000");
        assertThat(report.getExpensesCount()).isEqualTo(1);
        assertThat(report.getExpectedCash())
                .as("100 000 + 500 000 − 80 000")
                .isEqualByComparingTo("520000");
    }

    @Test
    @DisplayName("Karta bilan to'langan xarajat kassaga ta'sir qilmaydi")
    void cardExpenseDoesNotAffectCash() {
        CashShift shift = openShift("0");
        sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);

        expenseRepository.saveAndFlush(expense(shift, PaymentMethod.CARD, "300000"));

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getCashExpenses())
                .as("kassadan pul chiqmagan")
                .isEqualByComparingTo("0");
        assertThat(report.getExpensesCount())
                .as("lekin xarajat sifatida sanaladi")
                .isEqualTo(1);
        assertThat(report.getExpectedCash()).isEqualByComparingTo("500000");
    }

    @Test
    @DisplayName("Boshqa smenaning xarajatlari aralashmaydi")
    void otherShiftExpensesAreNotCounted() {
        CashShift first = openShift("0");
        expenseRepository.saveAndFlush(expense(first, PaymentMethod.CASH, "50000"));
        service.closeShift(cashier.getId(), close("-50000", null));

        CashShift second = openShift("0");
        expenseRepository.saveAndFlush(expense(second, PaymentMethod.CASH, "70000"));

        assertThat(service.getReport(second.getId()).getCashExpenses()).isEqualByComparingTo("70000");
        assertThat(service.getReport(first.getId()).getCashExpenses()).isEqualByComparingTo("50000");
    }

    @Test
    @DisplayName("Smenaga bog'lanmagan xarajat kassaga ta'sir qilmaydi")
    void expenseWithoutShiftIsIgnored() {
        CashShift shift = openShift("0");
        sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);

        expenseRepository.saveAndFlush(expense(null, PaymentMethod.CASH, "400000"));

        assertThat(service.getReport(shift.getId()).getExpectedCash())
                .as("bank orqali to'langan yoki smenasiz kiritilgan xarajat kassadan chiqmagan")
                .isEqualByComparingTo("500000");
    }

    // ─── Yopish ───

    @Test
    @DisplayName("Kamomad manfiy farq sifatida qayd etiladi")
    void shortageIsRecordedAsNegativeDifference() {
        CashShift shift = openShift("100000");
        sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);

        // Kutilgan 600 000, kassada 580 000 chiqdi
        ZReportResponse report = service.closeShift(cashier.getId(), close("580000", "20 000 yetishmadi"));

        assertThat(report.getExpectedCash()).isEqualByComparingTo("600000");
        assertThat(report.getCountedCash()).isEqualByComparingTo("580000");
        assertThat(report.getDifference()).isEqualByComparingTo("-20000");
        assertThat(shiftRepository.findById(shift.getId()))
                .get()
                .satisfies(s -> assertThat(s.getStatus()).isEqualTo(CashShiftStatus.CLOSED));
    }

    @Test
    @DisplayName("Yopilgan smenada kutilgan summa SAQLANADI (keyingi bekor qilish uni o'zgartirmaydi)")
    void expectedCashIsFrozenOnClose() {
        CashShift shift = openShift("0");
        Sale sold = sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);
        service.closeShift(cashier.getId(), close("500000", null));

        // Smena yopilgandan keyin savdo bekor qilinadi
        sold.setStatus(SaleStatus.CANCELLED);
        saleRepository.saveAndFlush(sold);

        assertThat(shiftRepository.findById(shift.getId()))
                .get()
                .satisfies(s -> {
                    assertThat(s.getExpectedCash())
                            .as("aks holda kamomad o'z-o'zidan yo'qolardi")
                            .isEqualByComparingTo("500000");
                    assertThat(s.getDifference()).isEqualByComparingTo("0");
                });
    }

    // Entity'dagi qiymat saqlansa-da, getReport ilgari expectedCash'ni JONLI
    // qayta hisoblab qaytarardi: bitta javobda ikki xil expectedCash chiqar,
    // difference = countedCash − expectedCash invarianti buzilardi.
    @Test
    @DisplayName("Yopilgan smena HISOBOTI ham saqlangan kutilgan summani ko'rsatadi")
    void closedShiftReportServesPersistedExpectedCash() {
        CashShift shift = openShift("0");
        Sale sold = sale(shift, PaymentMethod.CASH, "500000", "500000", "0", SaleStatus.COMPLETED);
        service.closeShift(cashier.getId(), close("500000", null));

        // Yopilgandan keyin savdo bekor qilinadi — jonli hisob 0 ko'rsatardi
        sold.setStatus(SaleStatus.CANCELLED);
        saleRepository.saveAndFlush(sold);

        ZReportResponse report = service.getReport(shift.getId());
        assertThat(report.getExpectedCash())
                .as("jonli qayta hisob emas, yopilish paytidagi haqiqat")
                .isEqualByComparingTo("500000");
        assertThat(report.getCountedCash().subtract(report.getExpectedCash()))
                .as("difference invarianti tiklanadi")
                .isEqualByComparingTo(report.getDifference());
    }

    @Test
    @DisplayName("Ikkinchi smenani ochib bo'lmaydi")
    void cannotOpenTwoShifts() {
        openShift("0");

        assertThatThrownBy(() -> service.openShift(cashier.getId(), open("0")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ochiq smena");
    }

    @Test
    @DisplayName("Ochiq smenasiz yopib bo'lmaydi")
    void cannotCloseWithoutOpenShift() {
        assertThatThrownBy(() -> service.closeShift(cashier.getId(), close("0", null)))
                .isInstanceOf(BadRequestException.class);
    }

    // --- helpers ---

    private CashShift openShift(String openingFloat) {
        service.openShift(cashier.getId(), open(openingFloat));
        return shiftRepository.findByOpenedByIdAndStatus(cashier.getId(), CashShiftStatus.OPEN).orElseThrow();
    }

    private static OpenShiftRequest open(String openingFloat) {
        OpenShiftRequest r = new OpenShiftRequest();
        r.setOpeningFloat(new BigDecimal(openingFloat));
        return r;
    }

    private static CloseShiftRequest close(String countedCash, String notes) {
        CloseShiftRequest r = new CloseShiftRequest();
        r.setCountedCash(new BigDecimal(countedCash));
        r.setNotes(notes);
        return r;
    }

    private Sale sale(CashShift shift, PaymentMethod method,
                      String total, String paid, String debt, SaleStatus status) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++invoiceSeq))
                .saleDate(LocalDateTime.now())
                .subtotal(new BigDecimal(total))
                .totalAmount(new BigDecimal(total))
                .paidAmount(new BigDecimal(paid))
                .debtAmount(new BigDecimal(debt))
                .paymentMethod(method)
                .paymentStatus(new BigDecimal(debt).signum() > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID)
                .status(status)
                .createdBy(cashier)
                .shift(shift)
                .build();
        return saleRepository.saveAndFlush(sale);
    }

    /** Qatorli savdo — real {@code createReturn} orqali qaytarish uchun. */
    private Sale soldWithItem(CashShift shift, PaymentMethod method, String unitPrice, int qty,
                              String paid, String debt) {
        BigDecimal total = new BigDecimal(unitPrice).multiply(BigDecimal.valueOf(qty));
        Sale sale = Sale.builder()
                .invoiceNumber("INV-" + (++invoiceSeq))
                .saleDate(LocalDateTime.now())
                .subtotal(total)
                .totalAmount(total)
                .paidAmount(new BigDecimal(paid))
                .debtAmount(new BigDecimal(debt))
                .paymentMethod(method)
                .paymentStatus(new BigDecimal(debt).signum() > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .createdBy(cashier)
                .shift(shift)
                .build();
        sale.getItems().add(SaleItem.builder()
                .sale(sale)
                .product(product)
                .quantity(qty)
                .unitPrice(new BigDecimal(unitPrice))
                .discount(BigDecimal.ZERO)
                .totalPrice(total)
                .build());
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

    private static Product product() {
        return Product.builder()
                .sku("SKU-Z-1")
                .name("Michelin Primacy 4")
                .sellingPrice(new BigDecimal("500000"))
                .quantity(100)
                .active(true)
                .build();
    }

    /** Qarz to'lovi — DebtService.makePayment kabi sale.paidAmount ham oshiriladi. */
    private Payment debtPayment(CashShift shift, Sale sale, PaymentMethod method, String amount) {
        sale.setPaidAmount(sale.getPaidAmount().add(new BigDecimal(amount)));
        sale.setDebtAmount(sale.getDebtAmount().subtract(new BigDecimal(amount)));
        saleRepository.saveAndFlush(sale);
        return paymentRepository.saveAndFlush(Payment.builder()
                .sale(sale)
                .amount(new BigDecimal(amount))
                .method(method)
                .paymentType(PaymentType.DEBT_PAYMENT)
                .paymentDate(LocalDateTime.now())
                .receivedBy(cashier)
                .shift(shift)
                .build());
    }

    private Expense expense(CashShift shift, PaymentMethod method, String amount) {
        return Expense.builder()
                .expenseDate(LocalDate.now())
                .category(ExpenseCategory.SUPPLIES)
                .amount(new BigDecimal(amount))
                .paymentMethod(method)
                .shift(shift)
                .createdBy(cashier)
                .build();
    }

    private static User user(String username) {
        User u = new User();
        u.setUsername(username);
        u.setPassword("{noop}x");
        u.setFullName("Kassir");
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }
}
