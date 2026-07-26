package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.repository.spec.ProductSpecs;
import uz.shinamagazin.api.util.TireSizeQuery;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shina o'lchami bo'yicha SERVER filtri.
 *
 * <p>Ilgari `/v1/catalog` width/profile/diameter parametrlarini qabul qilmasdi
 * va vitrina 200 tagacha mahsulotni brauzerga yuklab, u yerda filtrlardi.
 * Ikki oqibati bor edi: katalog o'sganda 200 dan keyingi mahsulotlar umuman
 * ko'rinmasdi, va mijoz "205/55R16" deb qidirsa — bu matn mahsulot NOMIDA
 * bo'lmasa — hech narsa topilmasdi, holbuki o'lcham alohida ustunlarda turadi.
 *
 * <p>Bu test filtr SQL darajasida ishlashini tekshiradi (mock emas, H2).
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:product-size;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductSizeFilterTest {

    @Autowired private ProductRepository productRepository;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        productRepository.saveAll(List.of(
                tire("A", 205, 55, 16),
                tire("B", 205, 55, 17),   // bir xil kenglik/profil, boshqa diametr
                tire("C", 225, 45, 17),
                tire("D", 205, 60, 16),   // bir xil kenglik/diametr, boshqa profil
                tire("E", 195, 65, 15)
        ));
        productRepository.flush();
    }

    @Test
    @DisplayName("To'liq o'lcham aynan bitta mahsulotni topadi")
    void filtersByFullSize() {
        assertThat(skusMatching(ProductSpecs.sizeIs(205, 55, 16))).containsExactly("A");
    }

    @Test
    @DisplayName("Faqat diametr — o'sha diametrdagi hammasi")
    void filtersByDiameterOnly() {
        assertThat(skusMatching(ProductSpecs.sizeIs(null, null, 17)))
                .containsExactlyInAnyOrder("B", "C");
    }

    @Test
    @DisplayName("Kenglik + profil (diametr farqi yo'q)")
    void filtersByWidthAndProfile() {
        assertThat(skusMatching(ProductSpecs.sizeIs(205, 55, null)))
                .containsExactlyInAnyOrder("A", "B");
    }

    @Test
    @DisplayName("Mos kelmaydigan o'lcham bo'sh natija beradi (yaqin mahsulotni tortmaydi)")
    void returnsEmptyForUnknownSize() {
        assertThat(skusMatching(ProductSpecs.sizeIs(205, 55, 18))).isEmpty();
    }

    @Test
    @DisplayName("O'lcham berilmasa filtr qo'llanmaydi")
    void noFilterWhenAllPartsAreNull() {
        assertThat(ProductSpecs.sizeIs(null, null, null))
                .as("null spetsifikatsiya — Specification.allOf uni e'tiborsiz qoldiradi")
                .isNull();
    }

    // ─── Qidiruv satridan o'lchamga: mijozning haqiqiy yo'li ───

    @Test
    @DisplayName("\"205/55R16\" qidiruvi to'g'ri mahsulotga olib keladi")
    void searchStringResolvesToSizeFilter() {
        TireSizeQuery parsed = TireSizeQuery.parse("205/55R16");

        assertThat(skusMatching(ProductSpecs.sizeIs(parsed.width(), parsed.profile(), parsed.diameter())))
                .containsExactly("A");
    }

    @Test
    @DisplayName("\"r17\" qidiruvi diametr bo'yicha filtrlaydi")
    void diameterSearchWorksEndToEnd() {
        TireSizeQuery parsed = TireSizeQuery.parse("r17");

        assertThat(skusMatching(ProductSpecs.sizeIs(parsed.width(), parsed.profile(), parsed.diameter())))
                .containsExactlyInAnyOrder("B", "C");
    }

    // --- helpers ---

    private List<String> skusMatching(Specification<Product> spec) {
        return productRepository.findAll(Specification.allOf(ProductSpecs.activeTrue(), spec),
                        PageRequest.of(0, 50))
                .getContent().stream()
                .map(Product::getSku)
                .toList();
    }

    private static Product tire(String sku, int width, int profile, int diameter) {
        return Product.builder()
                .sku(sku)
                .name("Shina " + width + "/" + profile + "R" + diameter)
                .width(width)
                .profile(profile)
                .diameter(diameter)
                .sellingPrice(BigDecimal.valueOf(1_000_000))
                .quantity(10)
                .active(true)
                .build();
    }
}
