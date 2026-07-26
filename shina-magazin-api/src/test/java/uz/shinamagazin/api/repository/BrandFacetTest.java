package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import uz.shinamagazin.api.entity.Brand;
import uz.shinamagazin.api.entity.Category;
import uz.shinamagazin.api.entity.Product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vitrinadagi brend tanlagichi.
 *
 * <p>Ilgari ro'yxat brauzerga yuklangan mahsulotlardan qurilardi va brend
 * nom bo'yicha brauzerda filtrlanardi. Ikki oqibati bor edi:
 * <ul>
 *   <li>birinchi sahifada mahsuloti yo'q brend tanlagichda UMUMAN
 *       ko'rinmasdi;
 *   <li>brend tanlanganda faqat o'sha sahifadagi mahsulotlar qolardi —
 *       natija jimgina to'liq bo'lmasdi.
 * </ul>
 *
 * <p>Endi ro'yxat butun katalogdan olinadi, filtr esa serverda
 * {@code brandId} bo'yicha ishlaydi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:brand-facets;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class BrandFacetTest {

    @Autowired private ProductRepository productRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private CategoryRepository categoryRepository;

    private Brand michelin;
    private Brand nokian;
    private Category tires;
    private Category wheels;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        brandRepository.deleteAll();
        categoryRepository.deleteAll();

        michelin = brandRepository.saveAndFlush(brand("Michelin"));
        nokian = brandRepository.saveAndFlush(brand("Nokian"));
        tires = categoryRepository.saveAndFlush(category("Shinalar"));
        wheels = categoryRepository.saveAndFlush(category("Disklar"));
    }

    @Test
    @DisplayName("Brend ro'yxati butun katalogdan, mahsulot soni bilan")
    void listsAllBrandsWithCounts() {
        saveProducts(michelin, tires, 3);
        saveProducts(nokian, tires, 1);

        assertThat(facets()).containsExactly(
                Map.entry("Michelin", 3L),
                Map.entry("Nokian", 1L));
    }

    // Bu aynan eski xato: brend katta bo'lsa ham, uning mahsulotlari yuklangan
    // sahifaga tushmasa tanlagichda ko'rinmasdi.
    @Test
    @DisplayName("Ko'p mahsulotli brend ham to'liq soni bilan chiqadi")
    void countsEveryProductNotJustFirstPage() {
        saveProducts(michelin, tires, 250);

        assertThat(facets()).containsExactly(Map.entry("Michelin", 250L));
    }

    @Test
    @DisplayName("Nofaol mahsulot sanalmaydi")
    void inactiveProductsAreExcluded() {
        saveProducts(michelin, tires, 2);
        Product hidden = product(michelin, tires, "HIDDEN");
        hidden.setActive(false);
        productRepository.saveAndFlush(hidden);

        assertThat(facets()).containsExactly(Map.entry("Michelin", 2L));
    }

    @Test
    @DisplayName("Mahsulotsiz brend ro'yxatga tushmaydi")
    void brandWithoutProductsIsOmitted() {
        saveProducts(michelin, tires, 1);

        assertThat(facets()).containsExactly(Map.entry("Michelin", 1L));
    }

    // Kategoriya tanlanganda tanlagich o'sha bo'limdagi brendlarni ko'rsatishi
    // kerak: "Disklar" bo'limida faqat shinasi bor brend chiqsa chalkash edi.
    @Test
    @DisplayName("Kategoriya tanlanganda faqat o'sha bo'lim brendlari")
    void scopesToSelectedCategory() {
        saveProducts(michelin, tires, 4);
        saveProducts(nokian, wheels, 2);

        assertThat(brandCounts(false, List.of(tires.getId())))
                .containsExactly(Map.entry("Michelin", 4L));
        assertThat(brandCounts(false, List.of(wheels.getId())))
                .containsExactly(Map.entry("Nokian", 2L));
    }

    @Test
    @DisplayName("Brendsiz mahsulot hisobni buzmaydi")
    void productWithoutBrandIsIgnored() {
        saveProducts(michelin, tires, 1);
        Product noBrand = product(null, tires, "NO-BRAND");
        productRepository.saveAndFlush(noBrand);

        assertThat(facets()).containsExactly(Map.entry("Michelin", 1L));
    }

    // --- helpers ---

    /** Barcha kategoriyalar bo'yicha facetlar, nom -> son. */
    private List<Map.Entry<String, Long>> facets() {
        return brandCounts(true, List.of(-1L));
    }

    private List<Map.Entry<String, Long>> brandCounts(boolean allCategories, List<Long> categoryIds) {
        return productRepository.brandFacets(allCategories, categoryIds).stream()
                .map(row -> Map.entry((String) row[1], ((Number) row[2]).longValue()))
                .collect(Collectors.toList());
    }

    private void saveProducts(Brand brand, Category category, int count) {
        for (int i = 0; i < count; i++) {
            productRepository.save(product(brand, category, brand.getName() + "-" + i));
        }
        productRepository.flush();
    }

    private static Product product(Brand brand, Category category, String sku) {
        Product p = new Product();
        p.setName(sku);
        p.setSku(sku);
        p.setBrand(brand);
        p.setCategory(category);
        p.setSellingPrice(new BigDecimal("1000000"));
        p.setPurchasePrice(new BigDecimal("700000"));
        p.setQuantity(10);
        p.setMinStockLevel(2);
        p.setActive(true);
        return p;
    }

    private static Brand brand(String name) {
        Brand b = new Brand();
        b.setName(name);
        b.setActive(true);
        return b;
    }

    private static Category category(String name) {
        Category c = new Category();
        c.setName(name);
        c.setActive(true);
        return c;
    }
}
