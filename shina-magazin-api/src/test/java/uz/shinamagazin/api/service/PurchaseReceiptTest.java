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
import uz.shinamagazin.api.dto.request.PurchaseItemRequest;
import uz.shinamagazin.api.dto.request.PurchaseReceiveRequest;
import uz.shinamagazin.api.dto.request.PurchaseRequest;
import uz.shinamagazin.api.dto.response.PurchaseItemResponse;
import uz.shinamagazin.api.dto.response.PurchaseOrderResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.entity.Supplier;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.PurchaseCurrency;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Kirim hujjati — ta'minotchi yuk xati shablonida.
 *
 * <p>Namuna hujjat: "LARGO TYRES GROUP", USD, 8 × 40 $ va 8 × 48,5 $, har
 * donaga 1 $ bonus, kurs 12 700, yo'l haqi 254 000 so'm. Bu yerda tannarx,
 * ta'minotchi qarzi va "kutilmoqda → qabul qilindi" oqimi qulflanadi:
 * xato bo'lsa foyda hisobi ham, ta'minotchi bilan hisob-kitob ham buziladi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:purchase-receipt;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PurchaseReceiptTest {

    @Autowired private PurchaseOrderRepository purchaseOrderRepository;
    @Autowired private PurchaseOrderItemRepository purchaseOrderItemRepository;
    @Autowired private PurchasePaymentRepository purchasePaymentRepository;
    @Autowired private PurchaseReturnRepository purchaseReturnRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    private PurchaseService service;
    private Supplier supplier;
    private Product joyroad195;
    private Product joyroad205;

    @BeforeEach
    void setUp() {
        stockMovementRepository.deleteAll();
        purchaseReturnRepository.deleteAll();
        purchasePaymentRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        productRepository.deleteAll();
        supplierRepository.deleteAll();
        userRepository.deleteAll();

        User manager = userRepository.saveAndFlush(user());
        supplier = supplierRepository.saveAndFlush(Supplier.builder()
                .name("Largo Tyres Group")
                .phone("+998904060036")
                .build());
        joyroad195 = productRepository.saveAndFlush(product("LRG-195-65-15", "Largo JOYROAD 195/65 R15"));
        joyroad205 = productRepository.saveAndFlush(product("LRG-205-60-16", "Largo JOYROAD 205/60 R16"));

        DocumentNumberService documentNumbers = mock(DocumentNumberService.class);
        when(documentNumbers.nextPurchaseOrderNumber())
                .thenAnswer(inv -> "PO-RC-" + System.nanoTime());

        service = new PurchaseService(purchaseOrderRepository, purchaseOrderItemRepository,
                purchasePaymentRepository, purchaseReturnRepository, supplierRepository,
                productRepository, stockMovementRepository, userRepository,
                new SupplierService(supplierRepository), documentNumbers);

        CustomUserDetails principal = new CustomUserDetails(manager);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("USD hujjat darhol qabul qilinsa: so'mdagi summalar, tannarx, zaxira va ta'minotchi qarzi")
    void usdReceiptReceivedImmediately() {
        PurchaseOrderResponse response = service.createPurchase(usdRequest(true, "0"));

        assertThat(response.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(response.getCurrency()).isEqualTo(PurchaseCurrency.USD);
        assertThat(response.getExchangeRate()).isEqualByComparingTo("12700");
        assertThat(response.getSupplierDocNumber()).isEqualTo("43 824");
        assertThat(response.getVehicleNumber()).isEqualTo("1 post");
        assertThat(response.getForeignTotalAmount()).as("To'lov summa (USD)").isEqualByComparingTo("692");
        assertThat(response.getGoodsAmount()).isEqualByComparingTo("8991600");
        assertThat(response.getBonusAmount()).isEqualByComparingTo("203200");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("8788400");
        assertThat(response.getTransportCost()).isEqualByComparingTo("254000");
        assertThat(response.getTotalQuantity()).isEqualTo(16);
        assertThat(response.getTotalReceivedQuantity()).isEqualTo(16);
        assertThat(response.getShortageQuantity()).isZero();
        assertThat(response.getReceivedByName()).isEqualTo("Menejer");
        assertThat(response.getReceivedAt()).isNotNull();

        PurchaseItemResponse line195 = lineFor(response, joyroad195);
        assertThat(line195.getForeignUnitPrice()).isEqualByComparingTo("40");
        assertThat(line195.getUnitPrice()).isEqualByComparingTo("508000");
        assertThat(line195.getBonusAmount()).isEqualByComparingTo("101600");
        // (4 064 000 − 101 600 + 127 000) / 8
        assertThat(line195.getLandedUnitCost()).isEqualByComparingTo("511175");

        // Zaxira va tannarx — yo'l haqi va bonus hisobga olingan holda
        Product reloaded195 = reload(joyroad195);
        assertThat(reloaded195.getQuantity()).isEqualTo(8);
        assertThat(reloaded195.getPurchasePrice()).isEqualByComparingTo("511175");
        assertThat(reload(joyroad205).getPurchasePrice()).isEqualByComparingTo("619125");

        // Ombor harakati hujjatga bog'langan (ilgari referenceId null edi)
        List<StockMovement> movements = stockMovementRepository.findAll();
        assertThat(movements).hasSize(2);
        assertThat(movements).allSatisfy(m -> {
            assertThat(m.getMovementType()).isEqualTo(MovementType.IN);
            assertThat(m.getReferenceType()).isEqualTo("PURCHASE");
            assertThat(m.getReferenceId()).isEqualTo(response.getId());
            assertThat(m.getSupplier().getId()).isEqualTo(supplier.getId());
        });

        // Ta'minotchi qarzi = to'lov summasi (yo'l haqisiz!)
        assertThat(reloadSupplier().getBalance()).isEqualByComparingTo("8788400");
    }

    @Test
    @DisplayName("Kutilayotgan hujjat: zaxira va qarz tegilmaydi, kam kelgan mol qabulda hisobga olinadi")
    void deferredReceiptWithShortage() {
        PurchaseOrderResponse created = service.createPurchase(usdRequest(false, "0"));

        assertThat(created.getStatus()).isEqualTo(PurchaseOrderStatus.ORDERED);
        assertThat(created.getTotalReceivedQuantity()).isZero();
        assertThat(created.getShortageQuantity()).as("hali sanalmagan — kamomad emas").isZero();
        assertThat(created.getReceivedAt()).isNull();
        assertThat(reload(joyroad195).getQuantity()).isZero();
        assertThat(reloadSupplier().getBalance()).isEqualByComparingTo("0");
        assertThat(stockMovementRepository.count()).isZero();

        // Mol keldi: 195 to'liq (8), 205 dan 6 ta
        PurchaseReceiveRequest receive = PurchaseReceiveRequest.builder()
                .items(List.of(
                        line(created, joyroad195, 8),
                        line(created, joyroad205, 6)))
                .notes("2 dona 205/60 R16 yetib kelmadi")
                .build();
        PurchaseOrderResponse received = service.receivePurchase(created.getId(), receive);

        assertThat(received.getStatus()).isEqualTo(PurchaseOrderStatus.PARTIAL);
        assertThat(received.getTotalReceivedQuantity()).isEqualTo(14);
        assertThat(received.getShortageQuantity()).isEqualTo(2);
        assertThat(received.getReceivedByName()).isEqualTo("Menejer");
        assertThat(received.getNotes()).contains("Kamomad: 2 dona").contains("yetib kelmadi");
        // Summalar KELGAN mol bo'yicha: 320 − 8 + 291 − 6 = 597 $
        assertThat(received.getForeignTotalAmount()).isEqualByComparingTo("597");
        assertThat(received.getTotalAmount()).isEqualByComparingTo("7581900");

        PurchaseItemResponse line205 = lineFor(received, joyroad205);
        assertThat(line205.getOrderedQuantity()).isEqualTo(8);
        assertThat(line205.getReceivedQuantity()).isEqualTo(6);
        assertThat(line205.getTotalPrice()).isEqualByComparingTo("3695700");
        // Yo'l haqi 14 donaga taqsimlanadi: 205 uchun 254 000 − 145 142,86
        assertThat(line205.getLandedUnitCost()).isEqualByComparingTo("621392.86");

        assertThat(reload(joyroad195).getQuantity()).isEqualTo(8);
        assertThat(reload(joyroad205).getQuantity()).isEqualTo(6);
        assertThat(reloadSupplier().getBalance()).as("faqat kelgan mol uchun qarz")
                .isEqualByComparingTo("7581900");

        // Qolgan 2 dona keyin keldi — o'sha endpoint, JAMI miqdor bilan
        PurchaseOrderResponse completed = service.receivePurchase(created.getId(),
                PurchaseReceiveRequest.builder()
                        .items(List.of(line(created, joyroad205, 8)))
                        .build());

        assertThat(completed.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(completed.getShortageQuantity()).isZero();
        assertThat(completed.getTotalAmount()).isEqualByComparingTo("8788400");
        assertThat(reload(joyroad205).getQuantity()).isEqualTo(8);
        assertThat(reloadSupplier().getBalance()).as("farq qo'shildi, ikki marta emas")
                .isEqualByComparingTo("8788400");

        // Uchinchi marta qabul qilib bo'lmaydi
        assertThatThrownBy(() -> service.receivePurchase(created.getId(), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("allaqachon");
    }

    @Test
    @DisplayName("Oldindan to'lov: mol kelguncha ta'minotchi bizga qarzdor, kelgach farq qoladi")
    void prepaymentBeforeReceipt() {
        PurchaseOrderResponse created = service.createPurchase(usdRequest(false, "1000000"));

        assertThat(reloadSupplier().getBalance()).isEqualByComparingTo("-1000000");
        assertThat(created.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIAL);

        PurchaseOrderResponse received = service.receivePurchase(created.getId(), null);

        assertThat(received.getStatus()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(received.getDebtAmount()).isEqualByComparingTo("7788400");
        assertThat(reloadSupplier().getBalance()).isEqualByComparingTo("7788400");
    }

    @Test
    @DisplayName("Hujjatdagidan ko'p qabul qilib bo'lmaydi, qabul qilinganini kamaytirib ham")
    void receiveQuantityBounds() {
        PurchaseOrderResponse created = service.createPurchase(usdRequest(false, "0"));

        assertThatThrownBy(() -> service.receivePurchase(created.getId(),
                PurchaseReceiveRequest.builder().items(List.of(line(created, joyroad195, 9))).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hujjatdagi miqdordan");

        service.receivePurchase(created.getId(),
                PurchaseReceiveRequest.builder().items(List.of(line(created, joyroad195, 8))).build());

        assertThatThrownBy(() -> service.receivePurchase(created.getId(),
                PurchaseReceiveRequest.builder().items(List.of(line(created, joyroad195, 5))).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("kamaytirib");
    }

    @Test
    @DisplayName("Faqat qabul qilinmagan va to'lanmagan hujjat bekor qilinadi")
    void cancelRules() {
        PurchaseOrderResponse pending = service.createPurchase(usdRequest(false, "0"));
        PurchaseOrderResponse cancelled = service.cancelPurchase(pending.getId(), "Ta'minotchi yubormadi");
        assertThat(cancelled.getStatus()).isEqualTo(PurchaseOrderStatus.CANCELLED);
        assertThat(cancelled.getNotes()).contains("Bekor qilindi: Ta'minotchi yubormadi");

        PurchaseOrderResponse received = service.createPurchase(usdRequest(true, "0"));
        assertThatThrownBy(() -> service.cancelPurchase(received.getId(), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("qaytarish");

        PurchaseOrderResponse prepaid = service.createPurchase(usdRequest(false, "500000"));
        assertThatThrownBy(() -> service.cancelPurchase(prepaid.getId(), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("oldindan to'lov");
    }

    @Test
    @DisplayName("USD hujjatda kurs majburiy; UZS hujjatda kurs 1 ga tenglashtiriladi")
    void exchangeRateRules() {
        PurchaseRequest noRate = usdRequest(true, "0");
        noRate.setExchangeRate(null);
        assertThatThrownBy(() -> service.createPurchase(noRate))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("kurs");

        PurchaseRequest uzs = usdRequest(true, "0");
        uzs.setCurrency(PurchaseCurrency.UZS);
        uzs.setExchangeRate(new BigDecimal("12700"));
        uzs.getItems().forEach(i -> {
            i.setUnitPrice(new BigDecimal("500000"));
            i.setBonusPerUnit(BigDecimal.ZERO);
        });
        PurchaseOrderResponse response = service.createPurchase(uzs);

        assertThat(response.getExchangeRate()).isEqualByComparingTo("1");
        assertThat(response.getForeignTotalAmount()).isNull();
        assertThat(response.getTotalAmount()).isEqualByComparingTo("8000000");
    }

    // --- helpers ---

    /** "LARGO TYRES GROUP" hujjati: Kun ID 43 824, 1 post, USD, kurs 12 700. */
    private PurchaseRequest usdRequest(boolean receiveNow, String paidAmount) {
        return PurchaseRequest.builder()
                .supplierId(supplier.getId())
                .orderDate(LocalDate.now())
                .currency(PurchaseCurrency.USD)
                .exchangeRate(new BigDecimal("12700"))
                .supplierDocNumber("43 824")
                .supplierDocDate(LocalDate.now().minusDays(1))
                .vehicleNumber("1 post")
                .transportCost(new BigDecimal("254000"))
                .paidAmount(new BigDecimal(paidAmount))
                .receiveNow(receiveNow)
                .items(List.of(
                        PurchaseItemRequest.builder()
                                .productId(joyroad195.getId()).quantity(8)
                                .unitPrice(new BigDecimal("40")).bonusPerUnit(BigDecimal.ONE).build(),
                        PurchaseItemRequest.builder()
                                .productId(joyroad205.getId()).quantity(8)
                                .unitPrice(new BigDecimal("48.5")).bonusPerUnit(BigDecimal.ONE).build()))
                .build();
    }

    private static PurchaseReceiveRequest.Line line(PurchaseOrderResponse response, Product product, int received) {
        return PurchaseReceiveRequest.Line.builder()
                .itemId(lineFor(response, product).getId())
                .receivedQuantity(received)
                .build();
    }

    private static PurchaseItemResponse lineFor(PurchaseOrderResponse response, Product product) {
        return response.getItems().stream()
                .filter(i -> i.getProductId().equals(product.getId()))
                .findFirst()
                .orElseThrow();
    }

    private Product reload(Product product) {
        entityManager.flush();
        entityManager.clear();
        return productRepository.findById(product.getId()).orElseThrow();
    }

    private Supplier reloadSupplier() {
        entityManager.flush();
        entityManager.clear();
        return supplierRepository.findById(supplier.getId()).orElseThrow();
    }

    private static Product product(String sku, String name) {
        return Product.builder()
                .sku(sku)
                .name(name)
                .sellingPrice(new BigDecimal("700000"))
                .quantity(0)
                .active(true)
                .build();
    }

    private static User user() {
        User u = new User();
        u.setUsername("menejer-receipt");
        u.setPassword("{noop}x");
        u.setFullName("Menejer");
        u.setRole(Role.MANAGER);
        u.setActive(true);
        return u;
    }
}
