package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import uz.shinamagazin.api.dto.response.ProductImportResult;
import uz.shinamagazin.api.entity.Brand;
import uz.shinamagazin.api.entity.Category;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.BrandRepository;
import uz.shinamagazin.api.repository.CategoryRepository;
import uz.shinamagazin.api.repository.ProductRepository;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;

/**
 * Mahsulotlarni Excel'dan import qilish.
 *
 * <p>Ilgari eksport 12 joyda bor edi, import esa umuman yo'q — ya'ni yangi
 * do'kon mingta mahsulotni qo'lda kiritishi kerak edi. Bu tizimga o'tishdagi
 * eng katta to'siq.
 *
 * <h3>Xavfsizlik uchun asosiy qaror: hammasi yoki hech nima</h3>
 *
 * <p>Avval BARCHA qatorlar tekshiriladi. Bitta qatorda ham xato bo'lsa hech
 * nima yozilmaydi va barcha xatolar birdan qaytariladi. Yarim import qilingan
 * katalog eng yomon holat: qaysi mahsulot tushgani noma'lum bo'lib qoladi va
 * faylni qayta yuklash dublikat yaratardi.
 *
 * <p>Shu tufayli {@code dryRun} va haqiqiy import bir xil yo'ldan o'tadi —
 * ko'rib chiqishda xato yo'q bo'lsa, qo'llashda ham bo'lmaydi.
 *
 * <h3>Ustunlar SARLAVHA bo'yicha topiladi</h3>
 *
 * <p>Tartib emas, nom bo'yicha: shunda dasturdan eksport qilingan faylni
 * tahrirlab qaytadan yuklash mumkin, va foydalanuvchi ustunlarni joyini
 * almashtirsa ham import buzilmaydi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImportService {

    /** Bitta importdagi maksimal qatorlar. Fayl butunlay xotirada o'qiladi. */
    public static final int MAX_ROWS = 5_000;

    // Sarlavhalar eksport bilan bir xil (ProductResponse @ExportColumn)
    private static final String COL_SKU = "sku";
    private static final String COL_NAME = "nomi";
    private static final String COL_BRAND = "brend";
    private static final String COL_CATEGORY = "kategoriya";
    private static final String COL_WIDTH = "kenglik";
    private static final String COL_PROFILE = "profil";
    private static final String COL_DIAMETER = "diametr";
    private static final String COL_LOAD_INDEX = "yuk indeksi";
    private static final String COL_SPEED = "tezlik reytingi";
    private static final String COL_SEASON = "mavsum";
    private static final String COL_PURCHASE_PRICE = "xarid narxi";
    private static final String COL_SELLING_PRICE = "sotuv narxi";
    private static final String COL_QUANTITY = "miqdor";
    private static final String COL_MIN_STOCK = "minimal zaxira";

    private static final List<String> REQUIRED_COLUMNS = List.of(COL_SKU, COL_NAME, COL_SELLING_PRICE);

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public ProductImportResult importProducts(MultipartFile file, boolean dryRun) {
        List<ProductImportResult.RowError> errors = new ArrayList<>();
        List<Product> toSave = new ArrayList<>();
        int created = 0;
        int updated = 0;
        int totalRows = 0;

        // Fayl ichidagi takroriy SKU'ni ham ushlaymiz — aks holda oxirgisi
        // avvalgisini jimgina bosib ketardi.
        Set<String> seenSkus = new HashSet<>();

        try (InputStream in = file.getInputStream(); Workbook workbook = new XSSFWorkbook(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> columns = readHeader(sheet);

            DataFormatter formatter = new DataFormatter();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (isBlank(row, formatter)) continue;

                totalRows++;
                if (totalRows > MAX_ROWS) {
                    throw new BadRequestException(String.format(
                            "Bitta importda maksimal %,d qator mumkin. Faylni bo'lib yuklang.", MAX_ROWS));
                }

                int excelRow = r + 1;   // foydalanuvchi ko'radigan raqam
                String sku = text(row, columns, COL_SKU, formatter);

                try {
                    if (sku.isBlank()) {
                        throw new BadRequestException("SKU bo'sh");
                    }
                    if (!seenSkus.add(sku.toLowerCase())) {
                        throw new BadRequestException("Faylda bu SKU takrorlangan");
                    }

                    Optional<Product> existing = productRepository.findBySku(sku);
                    Product product = existing.orElseGet(Product::new);
                    applyRow(product, row, columns, formatter, existing.isEmpty());

                    if (existing.isPresent()) updated++; else created++;
                    toSave.add(product);

                } catch (BadRequestException e) {
                    errors.add(new ProductImportResult.RowError(excelRow, sku, e.getMessage()));
                } catch (RuntimeException e) {
                    errors.add(new ProductImportResult.RowError(excelRow, sku,
                            "Qatorni o'qib bo'lmadi: " + e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new BadRequestException("Faylni o'qib bo'lmadi. .xlsx formatda ekanini tekshiring.");
        }

        if (totalRows == 0) {
            throw new BadRequestException("Faylda ma'lumot topilmadi");
        }

        // Xato bo'lsa HECH NIMA yozilmaydi — yarim import qilingan katalogdan
        // ko'ra, foydalanuvchi faylni tuzatib qayta yuklagani yaxshi.
        boolean apply = !dryRun && errors.isEmpty();
        if (apply) {
            productRepository.saveAll(toSave);
            log.info("Excel import: {} yangi, {} yangilangan mahsulot", created, updated);
        }

        return ProductImportResult.builder()
                .totalRows(totalRows)
                .created(created)
                .updated(updated)
                .errors(errors)
                .dryRun(!apply)
                .build();
    }

    /** Sarlavha qatorini o'qib, ustun nomi -> indeks xaritasini quradi. */
    private Map<String, Integer> readHeader(Sheet sheet) {
        Row header = sheet.getRow(0);
        if (header == null) {
            throw new BadRequestException("Sarlavha qatori topilmadi");
        }

        DataFormatter formatter = new DataFormatter();
        Map<String, Integer> columns = new HashMap<>();
        for (int c = 0; c < header.getLastCellNum(); c++) {
            String name = formatter.formatCellValue(header.getCell(c)).trim().toLowerCase();
            if (!name.isEmpty()) columns.putIfAbsent(name, c);
        }

        List<String> missing = REQUIRED_COLUMNS.stream().filter(col -> !columns.containsKey(col)).toList();
        if (!missing.isEmpty()) {
            throw new BadRequestException("Majburiy ustunlar yetishmayapti: " + String.join(", ", missing));
        }
        return columns;
    }

    private void applyRow(Product product, Row row, Map<String, Integer> columns,
                          DataFormatter formatter, boolean isNew) {
        product.setSku(text(row, columns, COL_SKU, formatter));

        String name = text(row, columns, COL_NAME, formatter);
        if (name.isBlank()) throw new BadRequestException("Nomi bo'sh");
        product.setName(name);

        BigDecimal sellingPrice = decimal(row, columns, COL_SELLING_PRICE, formatter);
        if (sellingPrice == null || sellingPrice.signum() <= 0) {
            throw new BadRequestException("Sotuv narxi musbat son bo'lishi kerak");
        }
        product.setSellingPrice(sellingPrice);
        product.setPurchasePrice(decimal(row, columns, COL_PURCHASE_PRICE, formatter));

        Integer quantity = integer(row, columns, COL_QUANTITY, formatter);
        if (quantity != null) {
            if (quantity < 0) throw new BadRequestException("Miqdor manfiy bo'lishi mumkin emas");
            product.setQuantity(quantity);
        } else if (isNew) {
            product.setQuantity(0);
        }

        Integer minStock = integer(row, columns, COL_MIN_STOCK, formatter);
        if (minStock != null) {
            if (minStock < 0) throw new BadRequestException("Minimal zaxira manfiy bo'lishi mumkin emas");
            product.setMinStockLevel(minStock);
        } else if (isNew) {
            product.setMinStockLevel(5);
        }

        product.setWidth(integer(row, columns, COL_WIDTH, formatter));
        product.setProfile(integer(row, columns, COL_PROFILE, formatter));
        product.setDiameter(integer(row, columns, COL_DIAMETER, formatter));
        product.setLoadIndex(emptyToNull(text(row, columns, COL_LOAD_INDEX, formatter)));
        product.setSpeedRating(emptyToNull(text(row, columns, COL_SPEED, formatter)));
        product.setSeason(parseSeason(text(row, columns, COL_SEASON, formatter)));

        // Brend/kategoriya NOM bo'yicha. Topilmasa xato — avtomatik yaratish
        // xavfli: bitta xato yozuv ("Michelen") katalogda soxta brend hosil
        // qilardi va uni keyin qo'lda tozalash kerak bo'lardi.
        String brandName = text(row, columns, COL_BRAND, formatter);
        if (!brandName.isBlank()) {
            Brand brand = brandRepository.findByName(brandName.trim())
                    .orElseThrow(() -> new BadRequestException("Brend topilmadi: " + brandName));
            product.setBrand(brand);
        }

        String categoryName = text(row, columns, COL_CATEGORY, formatter);
        if (!categoryName.isBlank()) {
            Category category = findCategoryByName(categoryName.trim())
                    .orElseThrow(() -> new BadRequestException("Kategoriya topilmadi: " + categoryName));
            product.setCategory(category);
        }

        if (isNew) {
            product.setActive(true);
        }
    }

    /** Kategoriya nomi unikal emas, shuning uchun faol kategoriyalar ichidan qidiramiz. */
    private Optional<Category> findCategoryByName(String name) {
        return categoryRepository.findByActiveTrue().stream()
                .filter(c -> c.getName().equalsIgnoreCase(name))
                .findFirst();
    }

    private static Season parseSeason(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim().toUpperCase().replace(' ', '_').replace('-', '_');
        return switch (value) {
            case "SUMMER", "YOZGI", "YOZ", "ЛЕТО", "ЛЕТНЯЯ" -> Season.SUMMER;
            case "WINTER", "QISHKI", "QISH", "ЗИМА", "ЗИМНЯЯ" -> Season.WINTER;
            case "ALL_SEASON", "ALLSEASON", "HAR_FASL", "VSESEZON", "ВСЕСЕЗОННАЯ" -> Season.ALL_SEASON;
            default -> throw new BadRequestException(
                    "Mavsum noto'g'ri: " + raw + " (yozgi / qishki / har_fasl)");
        };
    }

    // --- hujayra o'qish ---

    private static String text(Row row, Map<String, Integer> columns, String column, DataFormatter formatter) {
        Integer index = columns.get(column);
        if (index == null) return "";
        return formatter.formatCellValue(row.getCell(index)).trim();
    }

    private static Integer integer(Row row, Map<String, Integer> columns, String column, DataFormatter formatter) {
        String raw = text(row, columns, column, formatter);
        if (raw.isBlank()) return null;
        try {
            return Integer.valueOf(raw.replace(" ", "").replace(",", ""));
        } catch (NumberFormatException e) {
            throw new BadRequestException("\"" + column + "\" butun son bo'lishi kerak: " + raw);
        }
    }

    private static BigDecimal decimal(Row row, Map<String, Integer> columns, String column, DataFormatter formatter) {
        String raw = text(row, columns, column, formatter);
        if (raw.isBlank()) return null;
        try {
            // Excel'dan bo'sh joy ajratgichi va vergul kelishi mumkin
            return new BigDecimal(raw.replace(" ", "").replace(" ", "").replace(",", "."));
        } catch (NumberFormatException e) {
            throw new BadRequestException("\"" + column + "\" son bo'lishi kerak: " + raw);
        }
    }

    private static boolean isBlank(Row row, DataFormatter formatter) {
        if (row == null) return true;
        for (int c = 0; c < row.getLastCellNum(); c++) {
            if (!formatter.formatCellValue(row.getCell(c)).trim().isEmpty()) return false;
        }
        return true;
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    /**
     * Bo'sh shablon — foydalanuvchi ustun nomlarini taxmin qilmasin.
     * Sarlavhalar eksport bilan bir xil, shuning uchun eksport qilingan faylni
     * tahrirlab qaytadan yuklash ham ishlaydi.
     */
    public byte[] buildTemplate() {
        String[] headers = {
                "SKU", "Nomi", "Brend", "Kategoriya", "Kenglik", "Profil", "Diametr",
                "Yuk indeksi", "Tezlik reytingi", "Mavsum", "Xarid narxi", "Sotuv narxi",
                "Miqdor", "Minimal zaxira"
        };
        // Brend va kategoriya ATAYLAB bo'sh: ular MAVJUD nomlarga to'g'ri
        // kelishi kerak, va har bir do'konda ular boshqacha. Namunaga
        // "Michelin"/"Shinalar" yozib qo'ysak, shablonni yuklab, o'zgartirmasdan
        // import qilgan foydalanuvchi darhol "Brend topilmadi" xatosiga uchrardi.
        Object[] example = {
                "MCH-205-55-16", "Michelin Primacy 4", "", "",
                205, 55, 16, "91", "V", "yozgi", 800000, 1200000, 10, 4
        };

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Mahsulotlar");

            CellStyle headerStyle = workbook.createCellStyle();
            Font bold = workbook.createFont();
            bold.setBold(true);
            headerStyle.setFont(bold);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row exampleRow = sheet.createRow(1);
            for (int i = 0; i < example.length; i++) {
                Cell cell = exampleRow.createCell(i);
                if (example[i] instanceof Number n) {
                    cell.setCellValue(n.doubleValue());
                } else {
                    cell.setCellValue(String.valueOf(example[i]));
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Shablon yaratib bo'lmadi", e);
        }
    }
}
