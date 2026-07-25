package uz.shinamagazin.api.repository;

import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.SaleItem;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.CustomerType;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.enums.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Savdo ro'yxatining so'rovlar soni qatorlar soniga BOG'LIQ EMASLIGINI qulflaydi.
 *
 * <p>Muammo shu edi: `SaleResponse.from` har bir savdo uchun `customer`,
 * `createdBy`, `items` va har bir pozitsiya uchun `item.getProduct()` ga tegadi —
 * hammasi LAZY. Bundan tashqari `AuditEntityListener` har `@PostLoad`da
 * `toAuditMap()` chaqiradi, u esa `items.size()` va `payments.size()` bilan yana
 * ikkita kolleksiyani ishga tushiradi. Natijada 20 qatorlik sahifa yuzdan ortiq
 * so'rov qilardi. `open-in-view` yoqiq bo'lgani uchun bu xato bermasdi — faqat
 * sekinlashardi, ya'ni ma'lumot hajmi oshgani sari sezilardi.
 *
 * <p>Tekshiruv usuli ataylab ANIQ SONGA bog'lanmagan: 3 va 12 qatorli sahifalar
 * bir xil sonda so'rov qilishi kerak. Aniq son Hibernate versiyasi yoki mapping
 * o'zgarishi bilan tebranishi mumkin, N+1 belgisi esa — sonning qatorlar bilan
 * O'SISHI — barqaror va aynan shu tekshiriladi.
 *
 * <p>Shu test bilan o'lchangan haqiqiy natijalar:
 * <pre>
 *   qatorlar |  oldin  |  keyin
 *   ---------+---------+--------
 *      3     |   19    |    5
 *     12     |   64    |    5
 *     20     |  104    |    6
 * </pre>
 * "Oldin" — {@code default_batch_fetch_size} o'chirilgan va ro'yxat so'rovlarida
 * {@code @EntityGraph} yo'q holat. O'sish qator boshiga ~5 ta so'rov edi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:sale-nplus1;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.jpa.properties.hibernate.default_batch_fetch_size=50",
        "logging.level.org.hibernate.SQL=OFF",
        "logging.level.org.hibernate.stat=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SaleListNPlusOneTest {

    private static final int ITEMS_PER_SALE = 3;

    @Autowired private SaleRepository saleRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    private Statistics statistics;
    private User cashier;
    private Customer customer;
    /** SKU/invoice unikalligini o'lchovlar orasida ta'minlash uchun. */
    private int measurementRun;

    @BeforeEach
    void setUp() {
        statistics = entityManager.getEntityManagerFactory()
                .unwrap(SessionFactory.class)
                .getStatistics();
        statistics.setStatisticsEnabled(true);

        saleRepository.deleteAll();
        productRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.deleteAll();

        cashier = userRepository.saveAndFlush(cashier("kassir"));
        customer = customerRepository.saveAndFlush(customer());
    }

    @Test
    @DisplayName("Savdo ro'yxatining so'rovlar soni qatorlar soniga qarab O'SMAYDI")
    void listQueryCountDoesNotGrowWithRowCount() {
        long forThree = measureListing(3);
        long forTwelve = measureListing(12);

        assertThat(forTwelve)
                .as("""
                        3 va 12 qatorli sahifa bir xil sonda so'rov qilishi kerak.
                        3 qator -> %d ta so'rov, 12 qator -> %d ta so'rov.
                        Farq bo'lsa — LAZY assotsiatsiya qator bo'yicha yuklanmoqda (N+1).""",
                        forThree, forTwelve)
                .isEqualTo(forThree);
    }

    @Test
    @DisplayName("So'rovlar soni oqilona chegarada (regressiya uchun yuqori chegara)")
    void listQueryCountStaysSmall() {
        long queries = measureListing(20);

        // Kutilgan: 1 (savdolar + customer/createdBy grafik bilan) + items partiyasi
        // + item.product partiyasi + payments partiyasi (audit listener) ~ 4-6 ta.
        // Chegara bo'sh qo'yilgan: maqsad aniq sonni qotirish emas, kattalik
        // tartibi buzilsa (masalan @EntityGraph olib tashlansa) ushlash.
        assertThat(queries)
                .as("20 qatorli sahifa uchun %d ta so'rov — N+1 qaytgan bo'lishi mumkin", queries)
                .isLessThanOrEqualTo(12);
    }

    /**
     * Sahifani o'qib DTO'ga o'giradi va shu davrda bajarilgan so'rovlarni sanaydi.
     *
     * <p>Muhim: o'lchashdan oldin persistence context TOZALANADI. Aks holda
     * seed paytida yuklangan entity'lar birinchi darajali keshdan qaytib, N+1
     * ni butunlay yashirib qo'yardi — test yashil bo'lib, muammo joyida qolardi.
     */
    private long measureListing(int saleCount) {
        // Bir test ichida bir necha marta o'lchanadi — avvalgi tur ma'lumotini
        // tozalaymiz (sales avval: sale_items products'ga FK bilan bog'langan).
        saleRepository.deleteAll();
        productRepository.deleteAll();
        entityManager.flush();
        measurementRun++;

        for (int i = 0; i < saleCount; i++) {
            saleRepository.save(sale(i));
        }
        entityManager.flush();
        entityManager.clear();

        statistics.clear();

        Pageable pageable = PageRequest.of(0, 50);
        saleRepository.findAll(pageable)
                .map(SaleResponse::from)
                .getContent()
                // DTO'ni chindan tuzib chiqamiz — lazy tegishlar shu yerda yuz beradi
                .forEach(response -> assertThat(response.getItems()).hasSize(ITEMS_PER_SALE));

        return statistics.getPrepareStatementCount();
    }

    // --- fixtures ---

    private Sale sale(int index) {
        Sale sale = Sale.builder()
                .invoiceNumber("INV" + measurementRun + "-" + index)
                .customer(customer)
                .createdBy(cashier)
                .saleDate(LocalDateTime.now())
                .subtotal(BigDecimal.TEN)
                .totalAmount(BigDecimal.TEN)
                .paidAmount(BigDecimal.TEN)
                .paymentMethod(PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.PAID)
                .status(SaleStatus.COMPLETED)
                .build();

        for (int i = 0; i < ITEMS_PER_SALE; i++) {
            Product product = productRepository.save(product(measurementRun + "-" + index + "-" + i));
            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .quantity(1)
                    .unitPrice(BigDecimal.ONE)
                    .totalPrice(BigDecimal.ONE)
                    .build();
            sale.getItems().add(item);
        }
        return sale;
    }

    private static Product product(String suffix) {
        return Product.builder()
                .sku("SKU-" + suffix)
                .name("Shina " + suffix)
                .sellingPrice(BigDecimal.ONE)
                .quantity(100)
                .active(true)
                .build();
    }

    private static User cashier(String username) {
        User user = new User();
        user.setUsername(username);
        user.setPassword("{noop}x");
        user.setFullName("Kassir");
        user.setRole(Role.SELLER);
        user.setActive(true);
        return user;
    }

    private static Customer customer() {
        return Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998901112233")
                .customerType(CustomerType.INDIVIDUAL)
                .active(true)
                .build();
    }
}
