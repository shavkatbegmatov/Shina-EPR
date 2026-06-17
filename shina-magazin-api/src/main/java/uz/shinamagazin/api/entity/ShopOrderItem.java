package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.math.BigDecimal;

/**
 * Storefront buyurtmasi qatori. Mahsulotga FK + buyurtma paytidagi narx/nom
 * snapshot'i (mahsulot keyin o'zgarsa ham tarix saqlanadi).
 */
@Entity
@Table(name = "shop_order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private ShopOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    // Snapshot — javobni lazy-load'siz qaytarish va tarix uchun
    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "size_string", length = 30)
    private String sizeString;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;
}
