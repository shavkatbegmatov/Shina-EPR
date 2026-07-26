package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.dto.request.CloseShiftRequest;
import uz.shinamagazin.api.dto.request.OpenShiftRequest;
import uz.shinamagazin.api.dto.response.ZReportResponse;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.CashShiftRepository;
import uz.shinamagazin.api.repository.SaleRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    @Autowired private UserRepository userRepository;

    private CashShiftService service;
    private User cashier;
    private int invoiceSeq;

    @BeforeEach
    void setUp() {
        saleRepository.deleteAll();
        shiftRepository.deleteAll();
        userRepository.deleteAll();

        service = new CashShiftService(shiftRepository, userRepository);
        cashier = userRepository.saveAndFlush(user("kassir"));
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
