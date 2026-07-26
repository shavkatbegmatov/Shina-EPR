package uz.shinamagazin.api.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import uz.shinamagazin.api.dto.response.ProductImportResult;
import uz.shinamagazin.api.entity.Brand;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.BrandRepository;
import uz.shinamagazin.api.repository.CategoryRepository;
import uz.shinamagazin.api.repository.ProductRepository;

import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Excel import.
 *
 * <p>Ilgari eksport 12 joyda bor edi, import esa umuman yo'q — yangi do'kon
 * mingta mahsulotni qo'lda kiritishi kerak edi.
 *
 * <p>Eng muhim shartnoma: <b>xato bo'lsa HECH NIMA yozilmaydi</b>. Yarim
 * import qilingan katalog eng yomon holat — qaysi mahsulot tushgani noma'lum
 * va faylni qayta yuklash dublikat yaratardi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:product-import;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProductImportServiceTest {

    private static final String[] HEADERS = {
            "SKU", "Nomi", "Brend", "Kategoriya", "Kenglik", "Profil", "Diametr",
            "Yuk indeksi", "Tezlik reytingi", "Mavsum", "Xarid narxi", "Sotuv narxi",
            "Miqdor", "Minimal zaxira"
    };

    @Autowired private ProductRepository productRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private CategoryRepository categoryRepository;

    private ProductImportService service;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        brandRepository.deleteAll();
        brandRepository.saveAndFlush(Brand.builder().name("Michelin").active(true).build());

        service = new ProductImportService(productRepository, brandRepository, categoryRepository);
    }

    @Test
    @DisplayName("To'g'ri fayl mahsulot yaratadi")
    void createsProductsFromValidFile() {
        ProductImportResult result = service.importProducts(
                file(row("MCH-1", "Michelin Primacy 4", "Michelin", 1_200_000, 10)), false);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getCreated()).isEqualTo(1);
        assertThat(result.isDryRun()).isFalse();

        assertThat(productRepository.findBySku("MCH-1"))
                .get()
                .satisfies(p -> {
                    assertThat(p.getName()).isEqualTo("Michelin Primacy 4");
                    assertThat(p.getSellingPrice()).isEqualByComparingTo("1200000");
                    assertThat(p.getQuantity()).isEqualTo(10);
                    assertThat(p.getBrand().getName()).isEqualTo("Michelin");
                    assertThat(p.getActive()).isTrue();
                });
    }

    @Test
    @DisplayName("Mavjud SKU yangilanadi, dublikat yaratilmaydi")
    void existingSkuIsUpdatedNotDuplicated() {
        service.importProducts(file(row("MCH-1", "Eski nom", "Michelin", 1_000_000, 5)), false);

        ProductImportResult result = service.importProducts(
                file(row("MCH-1", "Yangi nom", "Michelin", 1_500_000, 8)), false);

        assertThat(result.getCreated()).isZero();
        assertThat(result.getUpdated()).isEqualTo(1);
        assertThat(productRepository.findAll()).hasSize(1);
        assertThat(productRepository.findBySku("MCH-1"))
                .get()
                .satisfies(p -> assertThat(p.getName()).isEqualTo("Yangi nom"));
    }

    @Test
    @DisplayName("dryRun bazani o'zgartirmaydi")
    void dryRunWritesNothing() {
        ProductImportResult result = service.importProducts(
                file(row("MCH-1", "Michelin Primacy 4", "Michelin", 1_200_000, 10)), true);

        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getCreated())
                .as("nima bo'lishini ko'rsatadi")
                .isEqualTo(1);
        assertThat(result.isDryRun()).isTrue();
        assertThat(productRepository.findAll())
                .as("lekin baza o'zgarmaydi")
                .isEmpty();
    }

    // Bu shartnomaning mag'zi: 2 ta to'g'ri qator va 1 ta xato qator bo'lsa,
    // to'g'rilari ham YOZILMAYDI.
    @Test
    @DisplayName("Bitta xato qator butun importni to'xtatadi")
    void oneBadRowBlocksTheWholeImport() {
        MultipartFile file = file(
                row("OK-1", "Yaxshi mahsulot", "Michelin", 1_000_000, 5),
                row("BAD", "Narxsiz mahsulot", "Michelin", null, 5),
                row("OK-2", "Yana yaxshi", "Michelin", 2_000_000, 3));

        ProductImportResult result = service.importProducts(file, false);

        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getSku()).isEqualTo("BAD");
        assertThat(result.getErrors().get(0).getRow())
                .as("foydalanuvchi Excel'da topa olishi uchun qator raqami")
                .isEqualTo(3);
        assertThat(productRepository.findAll())
                .as("yarim import qilingan katalog bo'lmasligi kerak")
                .isEmpty();
    }

    @Test
    @DisplayName("Faylda takrorlangan SKU aniqlanadi")
    void detectsDuplicateSkuWithinFile() {
        ProductImportResult result = service.importProducts(file(
                row("MCH-1", "Birinchi", "Michelin", 1_000_000, 5),
                row("MCH-1", "Ikkinchi", "Michelin", 2_000_000, 5)), false);

        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getMessage()).contains("takrorlangan");
    }

    // Avtomatik brend yaratish xavfli: "Michelen" kabi bitta xato yozuv
    // katalogda soxta brend hosil qilardi.
    @Test
    @DisplayName("Noma'lum brend xato beradi, avtomatik yaratilmaydi")
    void unknownBrandIsRejected() {
        ProductImportResult result = service.importProducts(
                file(row("X-1", "Shina", "Michelen", 1_000_000, 5)), false);

        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getMessage()).contains("Brend topilmadi");
        assertThat(brandRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("Majburiy ustun yetishmasa aniq xabar beriladi")
    void missingRequiredColumnIsReported() {
        MultipartFile file = fileWithHeaders(new String[]{"SKU", "Nomi"},
                new Object[]{"X-1", "Shina"});

        assertThatThrownBy(() -> service.importProducts(file, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("sotuv narxi");
    }

    @Test
    @DisplayName("Mavsum o'zbekcha, ruscha va inglizcha tushuniladi")
    void parsesSeasonInSeveralLanguages() {
        service.importProducts(file(
                rowWithSeason("S-1", "yozgi"),
                rowWithSeason("S-2", "ЗИМНЯЯ"),
                rowWithSeason("S-3", "ALL_SEASON")), false);

        assertThat(productRepository.findBySku("S-1")).get()
                .satisfies(p -> assertThat(p.getSeason()).isEqualTo(Season.SUMMER));
        assertThat(productRepository.findBySku("S-2")).get()
                .satisfies(p -> assertThat(p.getSeason()).isEqualTo(Season.WINTER));
        assertThat(productRepository.findBySku("S-3")).get()
                .satisfies(p -> assertThat(p.getSeason()).isEqualTo(Season.ALL_SEASON));
    }

    @Test
    @DisplayName("Manfiy miqdor rad etiladi")
    void rejectsNegativeQuantity() {
        ProductImportResult result = service.importProducts(
                file(row("X-1", "Shina", "Michelin", 1_000_000, -5)), false);

        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getMessage()).contains("manfiy");
    }

    @Test
    @DisplayName("Bo'sh qatorlar o'tkazib yuboriladi")
    void skipsBlankRows() {
        ProductImportResult result = service.importProducts(file(
                row("X-1", "Shina", "Michelin", 1_000_000, 5),
                null,
                row("X-2", "Shina 2", "Michelin", 2_000_000, 5)), false);

        assertThat(result.getTotalRows()).isEqualTo(2);
        assertThat(result.getErrors()).isEmpty();
    }

    // Shablon ishlamasa foydalanuvchi ustun nomlarini taxmin qilishga majbur —
    // shuning uchun uni import qila olishini tekshiramiz.
    @Test
    @DisplayName("Yaratilgan shablonni importning o'zi o'qiy oladi")
    void generatedTemplateIsImportable() {
        MultipartFile template = new MockMultipartFile(
                "file", "shablon.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                service.buildTemplate());

        ProductImportResult result = service.importProducts(template, true);

        assertThat(result.getErrors())
                .as("shablondagi namuna qator xatosiz o'qilishi kerak")
                .isEmpty();
        assertThat(result.getTotalRows()).isEqualTo(1);
    }

    @Test
    @DisplayName("Bo'sh fayl aniq xabar beradi")
    void emptyFileIsReported() {
        MultipartFile file = fileWithHeaders(HEADERS);

        assertThatThrownBy(() -> service.importProducts(file, true))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ma'lumot topilmadi");
    }

    // --- .xlsx quruvchi yordamchilar ---

    private static Object[] row(String sku, String name, String brand, Integer price, Integer qty) {
        return new Object[]{sku, name, brand, null, null, null, null, null, null, null, null, price, qty, null};
    }

    private static Object[] rowWithSeason(String sku, String season) {
        return new Object[]{sku, "Shina " + sku, "Michelin", null, null, null, null,
                null, null, season, null, 1_000_000, 5, null};
    }

    private static MultipartFile file(Object[]... rows) {
        return fileWithHeaders(HEADERS, rows);
    }

    private static MultipartFile fileWithHeaders(String[] headers, Object[]... rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Mahsulotlar");

            Row header = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }

            int rowIndex = 1;
            for (Object[] values : rows) {
                Row row = sheet.createRow(rowIndex++);
                if (values == null) continue;   // ataylab bo'sh qator
                for (int i = 0; i < values.length; i++) {
                    if (values[i] == null) continue;
                    Cell cell = row.createCell(i);
                    if (values[i] instanceof Number n) {
                        cell.setCellValue(n.doubleValue());
                    } else {
                        cell.setCellValue(String.valueOf(values[i]));
                    }
                }
            }

            workbook.write(out);
            return new MockMultipartFile("file", "mahsulotlar.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
