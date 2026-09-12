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

/**
 * Barter hujjatining qatori — mijozdan qabul qilingan eski shina.
 *
 * <p>Eski shina {@link #product} (B/U mahsulot) sifatida omborga kiradi va
 * keyin oddiy mahsulot kabi sotiladi. {@link #unitValue} — mijozga bir dona
 * uchun berilgan kredit; B/U kartochkaning tannarxi ham shundan hisoblanadi.
 */
@Entity
@Table(name = "trade_in_items")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeInItem extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trade_in_id", nullable = false)
    private TradeIn tradeIn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    /** Bir dona uchun berilgan kredit (so'm). */
    @Column(name = "unit_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitValue;

    @Column(name = "total_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalValue;

    /** Brend, holati ("protektor 60%") — chek va ombor izohi uchun. */
    @Column(length = 300)
    private String description;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "TradeInItem";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("quantity", this.quantity);
        map.put("unitValue", this.unitValue);
        map.put("totalValue", this.totalValue);
        map.put("description", this.description);

        // Avoid lazy loading
        if (this.tradeIn != null) {
            map.put("tradeInId", this.tradeIn.getId());
        }
        if (this.product != null) {
            map.put("productId", this.product.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
