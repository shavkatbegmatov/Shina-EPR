package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.CustomerType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "customers")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer extends BaseEntity implements Auditable {

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Column(name = "phone2", length = 20)
    private String phone2;

    @Column(length = 300)
    private String address;

    @Column(name = "company_name", length = 200)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_type", nullable = false, length = 20)
    @Builder.Default
    private CustomerType customerType = CustomerType.INDIVIDUAL;

    // Ijobiy = kredit, salbiy = qarz
    @Column(nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    // Portal authentication fields
    @Column(name = "pin_hash")
    private String pinHash;

    @Column(name = "pin_set_at")
    private LocalDateTime pinSetAt;

    @Column(name = "pin_attempts")
    @Builder.Default
    private Integer pinAttempts = 0;

    @Column(name = "pin_locked_until")
    private LocalDateTime pinLockedUntil;

    @Column(name = "preferred_language", length = 5)
    @Builder.Default
    private String preferredLanguage = "uz";

    @Column(name = "portal_enabled")
    @Builder.Default
    private Boolean portalEnabled = false;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Customer";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", this.id);
        map.put("fullName", this.fullName);
        map.put("phone", this.phone);
        map.put("phone2", this.phone2);
        map.put("address", this.address);
        map.put("companyName", this.companyName);
        map.put("customerType", this.customerType);
        map.put("balance", this.balance);
        map.put("notes", this.notes);
        map.put("active", this.active);
        map.put("pinHash", this.pinHash); // Will be masked
        map.put("pinSetAt", this.pinSetAt);
        map.put("pinAttempts", this.pinAttempts);
        map.put("pinLockedUntil", this.pinLockedUntil);
        map.put("preferredLanguage", this.preferredLanguage);
        map.put("portalEnabled", this.portalEnabled);
        map.put("lastLoginAt", this.lastLoginAt);

        // Avoid lazy loading
        if (this.createdBy != null) {
            map.put("createdById", this.createdBy.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of("pinHash");
    }
}
