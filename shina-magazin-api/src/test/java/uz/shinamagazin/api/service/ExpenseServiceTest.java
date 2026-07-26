package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import uz.shinamagazin.api.dto.request.CloseShiftRequest;
import uz.shinamagazin.api.dto.request.ExpenseRequest;
import uz.shinamagazin.api.dto.request.OpenShiftRequest;
import uz.shinamagazin.api.dto.response.ExpenseResponse;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.CashShiftRepository;
import uz.shinamagazin.api.repository.ExpenseRepository;
import uz.shinamagazin.api.repository.SaleReturnRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Xarajatlar servisi.
 *
 * <p>Diqqat markazida — xarajatning KASSA bilan aloqasi. Naqd xarajat
 * kassadan pul olib chiqadi, ya'ni Z-hisobotga ta'sir qiladi. Bu bog'lanish
 * noto'g'ri ishlasa kassirga asossiz kamomad yoziladi yoki aksincha,
 * kamomadni yashirish yo'li ochiladi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:expenses;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ExpenseServiceTest {

    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private CashShiftRepository shiftRepository;
    @Autowired private SaleReturnRepository saleReturnRepository;
    @Autowired private UserRepository userRepository;

    private ExpenseService service;
    private CashShiftService shiftService;
    private User cashier;

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 15);

    @BeforeEach
    void setUp() {
        expenseRepository.deleteAll();
        shiftRepository.deleteAll();
        userRepository.deleteAll();

        shiftService = new CashShiftService(shiftRepository, userRepository, saleReturnRepository, expenseRepository);
        service = new ExpenseService(expenseRepository, userRepository, shiftService);
        cashier = userRepository.saveAndFlush(user());
    }

    // ─── Smenaga bog'lanish ───

    @Test
    @DisplayName("Naqd xarajat ochiq smenaga bog'lanadi")
    void cashExpenseAttachesToOpenShift() {
        CashShift shift = openShift();

        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "80000"));

        assertThat(created.getShiftId())
                .as("kassadan pul chiqdi — Z-hisobot buni bilishi kerak")
                .isEqualTo(shift.getId());
    }

    @Test
    @DisplayName("Karta/o'tkazma xarajati smenaga bog'lanmaydi")
    void nonCashExpenseHasNoShift() {
        openShift();

        assertThat(service.create(cashier.getId(),
                request(PaymentMethod.CARD, ExpenseCategory.RENT, "3000000")).getShiftId())
                .as("kassaga tegmagan pul Z-hisobotda chiqim bo'lmasligi kerak")
                .isNull();
    }

    @Test
    @DisplayName("Ochiq smena bo'lmasa naqd xarajat smenasiz saqlanadi")
    void cashExpenseWithoutOpenShiftIsStillSaved() {
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.OTHER, "50000"));

        assertThat(created.getId()).isNotNull();
        assertThat(created.getShiftId())
                .as("xarajat kiritish TO'SILMAYDI — aks holda smenasiz ishlaydigan do'kon xarajat yozolmasdi")
                .isNull();
    }

    @Test
    @DisplayName("Naqddan boshqa usulga o'tkazilsa smena bog'lanishi uziladi")
    void switchingAwayFromCashDetachesShift() {
        openShift();
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "80000"));
        assertThat(created.getShiftId()).isNotNull();

        ExpenseResponse updated = service.update(created.getId(),
                request(PaymentMethod.TRANSFER, ExpenseCategory.SUPPLIES, "80000"));

        assertThat(updated.getShiftId())
                .as("kassadan chiqmagan pul Z-hisobotda chiqim bo'lib qolardi")
                .isNull();
    }

    // ─── Yopilgan smena himoyasi ───
    // Z-hisobot yopilishda muhrlanadi. Xarajatni keyin o'zgartirish
    // kamomadni orqadan "tuzatib qo'yish" yo'lini ochardi.

    @Test
    @DisplayName("Yopilgan smenadagi xarajatni tahrirlab bo'lmaydi")
    void cannotUpdateExpenseOfClosedShift() {
        openShift();
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "80000"));
        closeShift();

        assertThatThrownBy(() -> service.update(created.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "10000")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("yopilgan smena");
    }

    @Test
    @DisplayName("Yopilgan smenadagi xarajatni o'chirib bo'lmaydi")
    void cannotDeleteExpenseOfClosedShift() {
        openShift();
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "80000"));
        closeShift();

        assertThatThrownBy(() -> service.delete(created.getId()))
                .isInstanceOf(BadRequestException.class);
        assertThat(expenseRepository.findById(created.getId())).isPresent();
    }

    @Test
    @DisplayName("Ochiq smenadagi xarajatni tahrirlash mumkin")
    void canUpdateExpenseOfOpenShift() {
        openShift();
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.SUPPLIES, "80000"));

        ExpenseResponse updated = service.update(created.getId(),
                request(PaymentMethod.CASH, ExpenseCategory.TRANSPORT, "95000"));

        assertThat(updated.getAmount()).isEqualByComparingTo("95000");
        assertThat(updated.getCategory()).isEqualTo(ExpenseCategory.TRANSPORT);
    }

    @Test
    @DisplayName("Smenasiz xarajatni tahrirlash mumkin")
    void canUpdateExpenseWithoutShift() {
        ExpenseResponse created = service.create(cashier.getId(),
                request(PaymentMethod.TRANSFER, ExpenseCategory.RENT, "3000000"));

        assertThat(service.update(created.getId(),
                request(PaymentMethod.TRANSFER, ExpenseCategory.RENT, "3200000")).getAmount())
                .isEqualByComparingTo("3200000");
    }

    // ─── Ro'yxat ───

    @Test
    @DisplayName("Ro'yxat sana oralig'i bo'yicha filtrlanadi")
    void listFiltersByDateRange() {
        create(TODAY, ExpenseCategory.RENT, "100000");
        create(TODAY.minusMonths(1), ExpenseCategory.RENT, "900000");

        assertThat(service.search(TODAY.minusDays(3), TODAY, null, PageRequest.of(0, 20)).getContent())
                .singleElement()
                .satisfies(e -> assertThat(e.getAmount()).isEqualByComparingTo("100000"));
    }

    @Test
    @DisplayName("Ro'yxat turkum bo'yicha filtrlanadi")
    void listFiltersByCategory() {
        create(TODAY, ExpenseCategory.RENT, "100000");
        create(TODAY, ExpenseCategory.SALARY, "200000");

        assertThat(service.search(TODAY.minusDays(3), TODAY, ExpenseCategory.SALARY, PageRequest.of(0, 20)).getContent())
                .singleElement()
                .satisfies(e -> assertThat(e.getCategory()).isEqualTo(ExpenseCategory.SALARY));
    }

    @Test
    @DisplayName("Turkum berilmasa hammasi qaytadi")
    void listWithoutCategoryReturnsAll() {
        create(TODAY, ExpenseCategory.RENT, "100000");
        create(TODAY, ExpenseCategory.SALARY, "200000");

        assertThat(service.search(TODAY.minusDays(3), TODAY, null, PageRequest.of(0, 20)).getContent())
                .hasSize(2);
    }

    @Test
    @DisplayName("Teskari sana oralig'i rad etiladi")
    void reversedDateRangeIsRejected() {
        assertThatThrownBy(() -> service.search(TODAY, TODAY.minusDays(1), null, PageRequest.of(0, 20)))
                .isInstanceOf(BadRequestException.class);
    }

    // --- helpers ---

    private CashShift openShift() {
        OpenShiftRequest r = new OpenShiftRequest();
        r.setOpeningFloat(new BigDecimal("100000"));
        shiftService.openShift(cashier.getId(), r);
        return shiftRepository.findByOpenedByIdAndStatus(cashier.getId(), CashShiftStatus.OPEN).orElseThrow();
    }

    private void closeShift() {
        CloseShiftRequest r = new CloseShiftRequest();
        r.setCountedCash(new BigDecimal("20000"));
        shiftService.closeShift(cashier.getId(), r);
    }

    private ExpenseResponse create(LocalDate date, ExpenseCategory category, String amount) {
        ExpenseRequest r = request(PaymentMethod.TRANSFER, category, amount);
        r.setExpenseDate(date);
        return service.create(cashier.getId(), r);
    }

    private static ExpenseRequest request(PaymentMethod method, ExpenseCategory category, String amount) {
        return ExpenseRequest.builder()
                .expenseDate(TODAY)
                .category(category)
                .amount(new BigDecimal(amount))
                .paymentMethod(method)
                .description("test")
                .build();
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
