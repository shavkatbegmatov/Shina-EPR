package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Qaytarilgan savdo qatori. */
@Entity
@Table(name = "sale_return_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_return_id", nullable = false)
    private SaleReturn saleReturn;

    /**
     * Aynan qaysi savdo QATORI qaytarilyapti.
     *
     * <p>Mahsulot ID yetarli emas: bir mahsulot bitta savdoda turli narx yoki
     * chegirma bilan ikki qatorda bo'lishi mumkin, va qaytarishda qaysi
     * narxda pul qaytarish kerakligi shu qatordan aniqlanadi.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_item_id", nullable = false)
    private SaleItem saleItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;
}
