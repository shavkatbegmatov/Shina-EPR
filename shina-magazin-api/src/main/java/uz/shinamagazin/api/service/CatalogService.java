package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.response.CatalogFacetsResponse;
import uz.shinamagazin.api.dto.response.CatalogProductResponse;
import uz.shinamagazin.api.dto.response.CategoryAttributeResponse;
import uz.shinamagazin.api.dto.response.ProductAttributeValueResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.AttributeType;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.ProductAttributeValueRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.spec.ProductSpecs;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Ommaviy storefront katalogi (auth talab qilmaydi). Faqat o'qish.
 * Kategoriya tanlansa butun shajarasi (avlod kategoriyalar) qamrab olinadi;
 * atribut filtrlari Wildberries semantikasida ishlaydi (guruh ichida OR,
 * guruhlar orasida AND). Tannarx (purchasePrice) chiqarib tashlangan
 * CatalogProductResponse'ga map qilinadi.
 */
@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ProductRepository productRepository;
    private final ProductAttributeValueRepository valueRepository;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    public Page<CatalogProductResponse> getCatalog(
            Long brandId, Long categoryId, Season season, String search,
            BigDecimal priceMin, BigDecimal priceMax, Boolean inStock,
            Map<Long, List<Long>> attributeFilters, Pageable pageable) {

        Specification<Product> spec = Specification.allOf(
                ProductSpecs.activeTrue(),
                ProductSpecs.brandIs(brandId),
                ProductSpecs.categoryIn(categoryId != null
                        ? categoryService.collectDescendantIds(categoryId) : null),
                ProductSpecs.seasonIs(season),
                ProductSpecs.matchesSearch(search),
                ProductSpecs.priceGte(priceMin),
                ProductSpecs.priceLte(priceMax),
                ProductSpecs.inStock(inStock),
                ProductSpecs.hasAttributeOptions(attributeFilters));

        return productRepository.findAll(spec, pageable)
                .map(CatalogProductResponse::from);
    }

    @Transactional(readOnly = true)
    public CatalogProductResponse getCatalogProduct(Long id) {
        Product product = productRepository.findById(id)
                .filter(p -> Boolean.TRUE.equals(p.getActive())) // faol bo'lmagan mahsulot ommaga ko'rinmaydi
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));
        CatalogProductResponse response = CatalogProductResponse.from(product);
        response.setAttributes(ProductAttributeValueResponse.fromValues(
                valueRepository.findByProductIdWithAttribute(id)));
        return response;
    }

    /**
     * Filtr paneli uchun facetlar: kategoriya daraxti (mahsulot soni bilan),
     * narx diapazoni va tanlangan kategoriyaning (merosi bilan) filtrlanadigan
     * atributlari — har bir variantda mos mahsulotlar soni.
     */
    @Transactional(readOnly = true)
    public CatalogFacetsResponse getFacets(Long categoryId) {
        boolean allCategories = categoryId == null;
        List<Long> categoryIds = allCategories
                ? List.of(-1L)
                : new ArrayList<>(categoryService.collectDescendantIds(categoryId));

        // Narx diapazoni
        BigDecimal priceMin = null;
        BigDecimal priceMax = null;
        List<Object[]> range = productRepository.priceRange(allCategories, categoryIds);
        if (!range.isEmpty() && range.get(0)[0] != null) {
            priceMin = (BigDecimal) range.get(0)[0];
            priceMax = (BigDecimal) range.get(0)[1];
        }

        // Variant -> mahsulotlar soni
        Map<Long, Long> countsByOption = new HashMap<>();
        for (Object[] row : valueRepository.countProductsByOption(allCategories, categoryIds)) {
            countsByOption.put((Long) row[0], (Long) row[1]);
        }

        // Atribut facetlari: kategoriya tanlangan bo'lsa — effektiv (meros bilan)
        // filtrlanadigan SELECT/MULTI_SELECT atributlar
        List<CatalogFacetsResponse.AttributeFacet> facets = new ArrayList<>();
        if (!allCategories) {
            for (CategoryAttributeResponse ca : categoryService.getEffectiveAttributes(categoryId)) {
                var attribute = ca.getAttribute();
                boolean selectable = attribute.getType() == AttributeType.SELECT
                        || attribute.getType() == AttributeType.MULTI_SELECT;
                if (!Boolean.TRUE.equals(attribute.getFilterable()) || !selectable) {
                    continue;
                }
                List<CatalogFacetsResponse.OptionFacet> options = attribute.getOptions().stream()
                        .map(o -> new CatalogFacetsResponse.OptionFacet(
                                o.getId(), o.getValue(), countsByOption.getOrDefault(o.getId(), 0L)))
                        .filter(o -> o.getCount() > 0)
                        .toList();
                if (options.isEmpty()) {
                    continue;
                }
                facets.add(CatalogFacetsResponse.AttributeFacet.builder()
                        .id(attribute.getId())
                        .name(attribute.getName())
                        .code(attribute.getCode())
                        .type(attribute.getType())
                        .unit(attribute.getUnit())
                        .options(options)
                        .build());
            }
        }

        return CatalogFacetsResponse.builder()
                .categories(categoryService.getCategoryTree())
                .priceMin(priceMin)
                .priceMax(priceMax)
                .attributes(facets)
                .build();
    }

    /**
     * "12:34,35;7:88" ko'rinishidagi attrs parametrsatrini parse qiladi:
     * attributeId:optionId[,optionId] guruhlari ';' bilan ajratiladi.
     */
    public static Map<Long, List<Long>> parseAttributeFilters(String attrs) {
        Map<Long, List<Long>> result = new HashMap<>();
        if (attrs == null || attrs.isBlank()) {
            return result;
        }
        for (String group : attrs.split(";")) {
            String[] parts = group.split(":");
            if (parts.length != 2) {
                continue;
            }
            try {
                Long attributeId = Long.parseLong(parts[0].trim());
                List<Long> optionIds = new ArrayList<>();
                for (String option : parts[1].split(",")) {
                    if (!option.isBlank()) {
                        optionIds.add(Long.parseLong(option.trim()));
                    }
                }
                if (!optionIds.isEmpty()) {
                    result.put(attributeId, optionIds);
                }
            } catch (NumberFormatException ignored) {
                // noto'g'ri formatdagi guruh e'tiborsiz qoldiriladi
            }
        }
        return result;
    }
}
