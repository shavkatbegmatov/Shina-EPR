package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "products")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity implements Auditable {

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    // Shina o'lchamlari
    @Column(name = "width")
    private Integer width;          // 205, 225 (mm)

    @Column(name = "profile")
    private Integer profile;        // 55, 60 (%)

    @Column(name = "diameter")
    private Integer diameter;       // 16, 17, 18 (inch)

    @Column(name = "load_index", length = 10)
    private String loadIndex;       // 91, 94

    @Column(name = "speed_rating", length = 5)
    private String speedRating;     // H, V, W

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Season season;

    @Column(name = "purchase_price", precision = 15, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "selling_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal sellingPrice;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(name = "min_stock_level")
    @Builder.Default
    private Integer minStockLevel = 5;

    @Column(length = 1000)
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    // Helper method: shina o'lchami string
    public String getSizeString() {
        if (width != null && profile != null && diameter != null) {
            return String.format("%d/%d R%d", width, profile, diameter);
        }
        return null;
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Product";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", this.id);
        map.put("sku", this.sku);
        map.put("name", this.name);
        map.put("width", this.width);
        map.put("profile", this.profile);
        map.put("diameter", this.diameter);
        map.put("loadIndex", this.loadIndex);
        map.put("speedRating", this.speedRating);
        map.put("season", this.season);
        map.put("purchasePrice", this.purchasePrice);
        map.put("sellingPrice", this.sellingPrice);
        map.put("quantity", this.quantity);
        map.put("minStockLevel", this.minStockLevel);
        map.put("description", this.description);
        map.put("imageUrl", this.imageUrl);
        map.put("active", this.active);

        // Avoid lazy loading
        if (this.brand != null) {
            map.put("brandId", this.brand.getId());
        }
        if (this.category != null) {
            map.put("categoryId", this.category.getId());
        }
        if (this.createdBy != null) {
            map.put("createdById", this.createdBy.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
