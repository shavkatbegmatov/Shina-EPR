package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "brands")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brand extends BaseEntity implements Auditable {

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 100)
    private String country;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Brand";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("name", this.name);
        map.put("country", this.country);
        map.put("logoUrl", this.logoUrl);
        map.put("active", this.active);

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
