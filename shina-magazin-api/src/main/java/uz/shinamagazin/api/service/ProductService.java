package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.ProductAttributeValueRequest;
import uz.shinamagazin.api.dto.request.ProductRequest;
import uz.shinamagazin.api.dto.response.ProductAttributeValueResponse;
import uz.shinamagazin.api.dto.response.ProductResponse;
import uz.shinamagazin.api.entity.Attribute;
import uz.shinamagazin.api.entity.AttributeOption;
import uz.shinamagazin.api.entity.Brand;
import uz.shinamagazin.api.entity.Category;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.ProductAttributeValue;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.AttributeType;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.AttributeRepository;
import uz.shinamagazin.api.repository.BrandRepository;
import uz.shinamagazin.api.repository.CategoryRepository;
import uz.shinamagazin.api.repository.ProductAttributeValueRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.repository.spec.ProductSpecs;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AttributeRepository attributeRepository;
    private final ProductAttributeValueRepository valueRepository;
    private final CategoryService categoryService;

    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return productRepository.findByActiveTrue(pageable)
                .map(ProductResponse::from);
    }

    public Page<ProductResponse> searchProducts(String search, Pageable pageable) {
        return productRepository.searchProducts(search, pageable)
                .map(ProductResponse::from);
    }

    public Page<ProductResponse> getProductsWithFilters(
            Long brandId, Long categoryId, Season season, String search, Pageable pageable) {
        // Kategoriya tanlansa uning butun shajarasi (avlodlari) ham qamrab olinadi
        Specification<Product> spec = Specification.allOf(
                ProductSpecs.activeTrue(),
                ProductSpecs.brandIs(brandId),
                ProductSpecs.categoryIn(categoryId != null
                        ? categoryService.collectDescendantIds(categoryId) : null),
                ProductSpecs.seasonIs(season),
                ProductSpecs.matchesSearch(search));
        return productRepository.findAll(spec, pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));
        return withAttributes(ProductResponse.from(product));
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "sku", sku));
        return withAttributes(ProductResponse.from(product));
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new BadRequestException("Bu SKU allaqachon mavjud: " + request.getSku());
        }

        Product product = new Product();
        mapRequestToProduct(request, product);
        product.setCreatedBy(getCurrentUser());

        Product savedProduct = productRepository.save(product);
        saveAttributeValues(savedProduct, request.getAttributes());
        return withAttributes(ProductResponse.from(savedProduct));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));

        if (!product.getSku().equals(request.getSku()) &&
                productRepository.existsBySku(request.getSku())) {
            throw new BadRequestException("Bu SKU allaqachon mavjud: " + request.getSku());
        }

        mapRequestToProduct(request, product);
        Product savedProduct = productRepository.save(product);
        saveAttributeValues(savedProduct, request.getAttributes());
        return withAttributes(ProductResponse.from(savedProduct));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));
        product.setActive(false);
        productRepository.save(product);
    }

    public List<ProductResponse> getLowStockProducts() {
        return productRepository.findLowStockProducts().stream()
                .map(ProductResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductResponse adjustStock(Long id, int adjustment) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));

        int newQuantity = product.getQuantity() + adjustment;
        if (newQuantity < 0) {
            throw new BadRequestException("Zaxira manfiy bo'lishi mumkin emas");
        }

        product.setQuantity(newQuantity);
        return ProductResponse.from(productRepository.save(product));
    }

    private void mapRequestToProduct(ProductRequest request, Product product) {
        product.setSku(request.getSku());
        product.setName(request.getName());
        product.setWidth(request.getWidth());
        product.setProfile(request.getProfile());
        product.setDiameter(request.getDiameter());
        product.setLoadIndex(request.getLoadIndex());
        product.setSpeedRating(request.getSpeedRating());
        product.setSeason(request.getSeason());
        product.setPurchasePrice(request.getPurchasePrice());
        product.setSellingPrice(request.getSellingPrice());
        product.setQuantity(request.getQuantity() != null ? request.getQuantity() : 0);
        product.setMinStockLevel(request.getMinStockLevel() != null ? request.getMinStockLevel() : 5);
        product.setDescription(request.getDescription());
        product.setImageUrl(request.getImageUrl());

        if (request.getBrandId() != null) {
            Brand brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Brend", "id", request.getBrandId()));
            product.setBrand(brand);
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Kategoriya", "id", request.getCategoryId()));
            product.setCategory(category);
        }
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }

    // ============================================
    // Dinamik xususiyatlar (atribut qiymatlari)
    // ============================================

    private ProductResponse withAttributes(ProductResponse response) {
        response.setAttributes(ProductAttributeValueResponse.fromValues(
                valueRepository.findByProductIdWithAttribute(response.getId())));
        return response;
    }

    /**
     * Mahsulot atribut qiymatlarini to'liq almashtiradi (null -> tegilmaydi).
     * Har bir qiymat atribut turiga mosligi tekshiriladi.
     */
    private void saveAttributeValues(Product product, List<ProductAttributeValueRequest> requests) {
        if (requests == null) {
            return;
        }
        valueRepository.deleteByProductId(product.getId());
        if (requests.isEmpty()) {
            return;
        }

        List<Long> attributeIds = requests.stream()
                .map(ProductAttributeValueRequest::getAttributeId)
                .distinct()
                .toList();
        Map<Long, Attribute> attributes = attributeRepository.findAllById(attributeIds).stream()
                .collect(Collectors.toMap(Attribute::getId, Function.identity()));

        List<ProductAttributeValue> rows = new ArrayList<>();
        for (ProductAttributeValueRequest req : requests) {
            Attribute attribute = attributes.get(req.getAttributeId());
            if (attribute == null) {
                throw new ResourceNotFoundException("Atribut", "id", req.getAttributeId());
            }
            rows.addAll(buildValueRows(product, attribute, req));
        }
        valueRepository.saveAll(rows);
    }

    private List<ProductAttributeValue> buildValueRows(
            Product product, Attribute attribute, ProductAttributeValueRequest req) {
        List<ProductAttributeValue> rows = new ArrayList<>();
        AttributeType type = attribute.getType();

        if (type == AttributeType.SELECT || type == AttributeType.MULTI_SELECT) {
            List<Long> optionIds = req.getOptionIds() != null ? req.getOptionIds() : List.of();
            if (optionIds.isEmpty()) {
                return rows; // qiymat tanlanmagan — o'tkazib yuboriladi
            }
            if (type == AttributeType.SELECT && optionIds.size() > 1) {
                throw new BadRequestException(
                        "\"" + attribute.getName() + "\" atributiga faqat bitta variant tanlanadi");
            }
            Map<Long, AttributeOption> byId = attribute.getOptions().stream()
                    .collect(Collectors.toMap(AttributeOption::getId, Function.identity()));
            for (Long optionId : optionIds.stream().distinct().toList()) {
                AttributeOption option = byId.get(optionId);
                if (option == null) {
                    throw new BadRequestException(
                            "Variant (id=" + optionId + ") \"" + attribute.getName() + "\" atributiga tegishli emas");
                }
                rows.add(ProductAttributeValue.builder()
                        .product(product)
                        .attribute(attribute)
                        .option(option)
                        .build());
            }
            return rows;
        }

        ProductAttributeValue.ProductAttributeValueBuilder builder = ProductAttributeValue.builder()
                .product(product)
                .attribute(attribute);
        switch (type) {
            case NUMBER -> {
                if (req.getValueNumber() == null) return rows;
                rows.add(builder.valueNumber(req.getValueNumber()).build());
            }
            case BOOLEAN -> {
                if (req.getValueBool() == null) return rows;
                rows.add(builder.valueBool(req.getValueBool()).build());
            }
            default -> {
                if (req.getValueText() == null || req.getValueText().isBlank()) return rows;
                rows.add(builder.valueText(req.getValueText().trim()).build());
            }
        }
        return rows;
    }
}
