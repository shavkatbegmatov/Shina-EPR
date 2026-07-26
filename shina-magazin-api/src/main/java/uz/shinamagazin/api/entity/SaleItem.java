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
@Table(name = "sale_items")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleItem extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice;

    /**
     * Sotuv paytidagi tannarx — foyda hisobi uchun muhrlanadi.
     *
     * <p>Mahsulotning JORIY {@code purchasePrice} ini ishlatib bo'lmaydi:
     * ta'minotchi narxi keyin o'zgarsa o'tgan oyning foydasi ham o'zgarib
     * ketardi. Eski qatorlarda {@code null} bo'lishi mumkin (V34 gacha
     * yozilmagan) — u holda joriy xarid narxiga qaytiladi.
     */
    @Column(name = "cost_price", precision = 15, scale = 2)
    private BigDecimal costPrice;

    /**
     * Chegirmani hisobga olgan holdagi bir dona narxi.
     *
     * <p>{@code unitPrice} chegirmagacha bo'lgan narx; foydani undan hisoblash
     * chegirma berilgan savdolarda foydani oshirib ko'rsatardi.
     */
    public BigDecimal effectiveUnitPrice() {
        if (quantity == null || quantity == 0 || totalPrice == null) {
            return unitPrice != null ? unitPrice : BigDecimal.ZERO;
        }
        return totalPrice.divide(BigDecimal.valueOf(quantity), 2, java.math.RoundingMode.HALF_UP);
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "SaleItem";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("quantity", this.quantity);
        map.put("unitPrice", this.unitPrice);
        map.put("discount", this.discount);
        map.put("totalPrice", this.totalPrice);

        // Avoid lazy loading
        if (this.sale != null) {
            map.put("saleId", this.sale.getId());
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
