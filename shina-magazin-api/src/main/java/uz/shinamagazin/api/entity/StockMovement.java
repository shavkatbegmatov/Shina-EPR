package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.MovementType;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "stock_movements")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement extends BaseEntity implements Auditable {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 20)
    private MovementType movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "previous_stock", nullable = false)
    private Integer previousStock;

    @Column(name = "new_stock", nullable = false)
    private Integer newStock;

    @Column(name = "reference_type", length = 50)
    private String referenceType;  // SALE, PURCHASE, ADJUSTMENT, RETURN

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "StockMovement";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("movementType", this.movementType);
        map.put("quantity", this.quantity);
        map.put("previousStock", this.previousStock);
        map.put("newStock", this.newStock);
        map.put("referenceType", this.referenceType);
        map.put("referenceId", this.referenceId);
        map.put("notes", this.notes);

        // Avoid lazy loading
        if (this.product != null) {
            map.put("productId", this.product.getId());
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
