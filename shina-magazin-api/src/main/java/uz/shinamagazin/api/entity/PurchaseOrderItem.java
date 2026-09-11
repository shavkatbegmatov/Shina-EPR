package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "purchase_order_items")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItem extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "ordered_quantity", nullable = false)
    private Integer orderedQuantity;

    @Column(name = "received_quantity")
    @Builder.Default
    private Integer receivedQuantity = 0;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;

    // ─── Kirim hujjati qatori ───

    /** Narx hujjat valyutasida (masalan 46.25 USD); UZS hujjatda null. */
    @Column(name = "foreign_unit_price", precision = 15, scale = 4)
    private BigDecimal foreignUnitPrice;

    /** Bir dona uchun bonus (so'm) — shablondagi "Bonus $" ustuni. */
    @Column(name = "bonus_per_unit", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal bonusPerUnit = BigDecimal.ZERO;

    /** Qator bonusi foizda — "Bonus %" ustuni ({@code bonusPerUnit} o'rniga). */
    @Column(name = "bonus_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal bonusPercent = BigDecimal.ZERO;

    /** Qator bonusi (so'm) — "Bonus summa" ustuni. */
    @Column(name = "bonus_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal bonusAmount = BigDecimal.ZERO;

    /**
     * Tannarx (so'm): {@code (totalPrice − bonusAmount + yo'l haqi ulushi) / miqdor}.
     * Mahsulot kartochkasidagi {@code purchasePrice} aynan shundan yoziladi.
     */
    @Column(name = "landed_unit_cost", precision = 15, scale = 2)
    private BigDecimal landedUnitCost;

    /** Eski qatorlarda tannarx yozilmagan — u holda xarid narxi. */
    public BigDecimal effectiveLandedUnitCost() {
        return landedUnitCost != null ? landedUnitCost : unitPrice;
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "PurchaseOrderItem";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("orderedQuantity", this.orderedQuantity);
        map.put("receivedQuantity", this.receivedQuantity);
        map.put("unitPrice", this.unitPrice);
        map.put("totalPrice", this.totalPrice);
        map.put("foreignUnitPrice", this.foreignUnitPrice);
        map.put("bonusPerUnit", this.bonusPerUnit);
        map.put("bonusPercent", this.bonusPercent);
        map.put("bonusAmount", this.bonusAmount);
        map.put("landedUnitCost", this.landedUnitCost);

        // Avoid lazy loading
        if (this.purchaseOrder != null) {
            map.put("purchaseOrderId", this.purchaseOrder.getId());
        }
        if (this.product != null) {
            map.put("productId", this.product.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
