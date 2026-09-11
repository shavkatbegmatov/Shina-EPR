package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.entity.Brand;
import uz.shinamagazin.api.entity.Category;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.CategoryTemplate;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.BrandRepository;
import uz.shinamagazin.api.repository.CategoryRepository;
import uz.shinamagazin.api.repository.ProductRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

/**
 * Barterda qabul qilingan eski shinalar uchun B/U mahsulot kartochkasi.
 *
 * <p>Kassir savdo paytida SKU o'ylab o'tirmasligi kerak: o'lcham (va
 * ixtiyoriy brend) beriladi, mahsulot {@code BU-205-55-R16[-BREND]} kaliti
 * bo'yicha topiladi yoki yaratiladi. Bir o'lchamdagi barcha B/U shinalar
 * bitta kartochkada yig'iladi — "B/U 205/55 R16: 7 dona" — aynan shu
 * omborchi ko'rmoqchi bo'lgan raqam.
 *
 * <p>Brend AVTOMATIK YARATILMAYDI (import bilan bir xil siyosat: bitta xato
 * yozuv katalogda soxta brend hosil qilardi) — mavjud bo'lsa bog'lanadi,
 * bo'lmasa nomda qoladi.
 */
@Service
@RequiredArgsConstructor
public class UsedProductService {

    /** Ishlatilgan shinalar kategoriyasi — birinchi barterda yaratiladi. */
    public static final String USED_CATEGORY_NAME = "Ishlatilgan shinalar";
    public static final String SKU_PREFIX = "BU-";

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;

    /**
     * So'rovdagi eski shina uchun mahsulot kartochkasi: mavjud
     * ({@code productId}) yoki o'lcham bo'yicha topilgan/yaratilgan.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Product resolve(TradeInItemRequest request, User createdBy) {
        if (request.getProductId() != null) {
            Product product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", request.getProductId()));
            if (!Boolean.TRUE.equals(product.getActive())) {
                throw new BadRequestException(String.format(
                        "\"%s\" arxivlangan — unga barter kirim qilib bo'lmaydi", product.getName()));
            }
            return product;
        }

        if (request.getWidth() == null || request.getProfile() == null || request.getDiameter() == null) {
            throw new BadRequestException(
                    "Eski shina uchun o'lcham (eni/profil/diametr) yoki mavjud mahsulot ko'rsatilishi shart");
        }

        String brandName = trimToNull(request.getBrandName());
        Brand brand = brandName != null
                ? brandRepository.findFirstByNameIgnoreCase(brandName).orElse(null)
                : null;
        String sku = buildSku(request.getWidth(), request.getProfile(), request.getDiameter(),
                brand != null ? brand.getName() : brandName);

        return productRepository.findBySku(sku)
                .map(existing -> {
                    if (!Boolean.TRUE.equals(existing.getActive())) {
                        // Arxivlangan B/U kartochka qayta tiriltiriladi — aks holda
                        // shu o'lchamdagi barter umuman rasmiylashtirilmasdi
                        existing.setActive(true);
                    }
                    return existing;
                })
                .orElseGet(() -> create(request, sku, brand, brandName, createdBy));
    }

    /** {@code BU-205-55-R16} yoki brend bilan {@code BU-205-55-R16-MICHELIN}. */
    static String buildSku(int width, int profile, int diameter, String brandName) {
        String sku = SKU_PREFIX + width + "-" + profile + "-R" + diameter;
        String code = brandCode(brandName);
        return code.isEmpty() ? sku : sku + "-" + code;
    }

    private static String brandCode(String brandName) {
        if (brandName == null) {
            return "";
        }
        String code = brandName.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return code.length() > 12 ? code.substring(0, 12) : code;
    }

    private Product create(TradeInItemRequest request, String sku, Brand brand,
                           String brandName, User createdBy) {
        String displayBrand = brand != null ? brand.getName() : brandName;
        String name = "B/U " + (displayBrand != null ? displayBrand + " " : "")
                + request.getWidth() + "/" + request.getProfile() + " R" + request.getDiameter();

        BigDecimal credit = nz(request.getUnitValue()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal resale = request.getResalePrice() != null && request.getResalePrice().signum() > 0
                ? request.getResalePrice().setScale(2, RoundingMode.HALF_UP)
                : credit;

        Product product = Product.builder()
                .sku(sku)
                .name(name)
                .brand(brand)
                .category(usedCategory())
                .width(request.getWidth())
                .profile(request.getProfile())
                .diameter(request.getDiameter())
                .purchasePrice(credit)
                .sellingPrice(resale)
                .quantity(0)
                // B/U shina "kam qoldi" ogohlantirishiga tushmasin: u
                // buyurtma qilinmaydi, mijoz olib kelganda paydo bo'ladi
                .minStockLevel(0)
                .description("Barter orqali qabul qilingan ishlatilgan shina")
                .active(true)
                .createdBy(createdBy)
                .build();
        return productRepository.save(product);
    }

    private Category usedCategory() {
        return categoryRepository.findFirstByNameIgnoreCaseAndActiveTrue(USED_CATEGORY_NAME)
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(USED_CATEGORY_NAME)
                        .description("Barter orqali qabul qilingan B/U shinalar")
                        .icon("recycle")
                        .template(CategoryTemplate.TIRE)
                        .sortOrder(99)
                        .active(true)
                        .build()));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
