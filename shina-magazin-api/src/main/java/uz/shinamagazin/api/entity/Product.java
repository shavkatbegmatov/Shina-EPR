package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.Season;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

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
}
