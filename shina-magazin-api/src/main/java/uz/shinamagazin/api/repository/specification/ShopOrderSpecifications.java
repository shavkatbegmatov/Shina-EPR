package uz.shinamagazin.api.repository.specification;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Type-safe, composable filters for the staff storefront-order list. */
public final class ShopOrderSpecifications {

    private ShopOrderSpecifications() {
    }

    public static Specification<ShopOrder> withFilters(
            ShopOrderStatus status, Long customerId, String customerPhone, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (customerId != null) {
                predicates.add(cb.or(
                        cb.equal(root.join("customer", JoinType.LEFT).get("id"), customerId),
                        cb.equal(root.get("customerPhone"), customerPhone)));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("orderNo")), pattern),
                        cb.like(cb.lower(root.get("customerName")), pattern),
                        cb.like(cb.lower(root.get("customerPhone")), pattern)));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
