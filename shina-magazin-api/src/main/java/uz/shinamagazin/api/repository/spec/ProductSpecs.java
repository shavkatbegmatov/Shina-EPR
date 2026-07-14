package uz.shinamagazin.api.repository.spec;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.ProductAttributeValue;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Mahsulot filtrlash spetsifikatsiyalari — admin ro'yxati va ommaviy katalog
 * bitta dvijokdan foydalanadi. Barcha metodlar null-havfsiz: filtr berilmasa
 * null qaytadi (Specification.allOf null'larni e'tiborsiz qoldiradi).
 */
public final class ProductSpecs {

    private ProductSpecs() {
    }

    public static Specification<Product> activeTrue() {
        return (root, query, cb) -> cb.isTrue(root.get("active"));
    }

    public static Specification<Product> brandIs(Long brandId) {
        if (brandId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("brand").get("id"), brandId);
    }

    /** Kategoriya subtree bo'yicha (tanlangan kategoriya + barcha avlodlari). */
    public static Specification<Product> categoryIn(Collection<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return null;
        }
        return (root, query, cb) -> root.get("category").get("id").in(categoryIds);
    }

    public static Specification<Product> seasonIs(Season season) {
        if (season == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("season"), season);
    }

    public static Specification<Product> matchesSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String like = "%" + search.trim().toLowerCase() + "%";
        return (root, query, cb) -> {
            Join<Object, Object> brand = root.join("brand", JoinType.LEFT);
            return cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("sku")), like),
                    cb.like(cb.lower(brand.get("name")), like));
        };
    }

    public static Specification<Product> priceGte(BigDecimal min) {
        if (min == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("sellingPrice"), min);
    }

    public static Specification<Product> priceLte(BigDecimal max) {
        if (max == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("sellingPrice"), max);
    }

    public static Specification<Product> inStock(Boolean onlyInStock) {
        if (!Boolean.TRUE.equals(onlyInStock)) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThan(root.get("quantity"), 0);
    }

    /**
     * Atribut filtrlari: har bir atribut guruhi ichida OR (variantlardan biri),
     * guruhlar orasida AND (hammasi mos kelishi shart) — Wildberries semantikasi.
     */
    public static Specification<Product> hasAttributeOptions(Map<Long, List<Long>> optionsByAttribute) {
        if (optionsByAttribute == null || optionsByAttribute.isEmpty()) {
            return null;
        }
        Specification<Product> combined = null;
        for (Map.Entry<Long, List<Long>> group : optionsByAttribute.entrySet()) {
            if (group.getValue() == null || group.getValue().isEmpty()) {
                continue;
            }
            Specification<Product> spec = attributeGroup(group.getKey(), group.getValue());
            combined = combined == null ? spec : combined.and(spec);
        }
        return combined;
    }

    private static Specification<Product> attributeGroup(Long attributeId, List<Long> optionIds) {
        return (root, query, cb) -> {
            Subquery<Long> sub = query.subquery(Long.class);
            var value = sub.from(ProductAttributeValue.class);
            sub.select(cb.literal(1L))
                    .where(cb.and(
                            cb.equal(value.get("product"), root),
                            cb.equal(value.get("attribute").get("id"), attributeId),
                            value.get("option").get("id").in(optionIds)));
            return cb.exists(sub);
        };
    }
}
