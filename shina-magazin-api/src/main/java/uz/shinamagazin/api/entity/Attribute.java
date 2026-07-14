package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.AttributeType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Mahsulot xususiyati (atribut) ta'rifi — masalan "Yo'l turi", "RunFlat", "Kafolat".
 * Kategoriyalarga bog'lanadi (CategoryAttribute) va bola kategoriyalarga meros bo'lib o'tadi.
 */
@Entity
@Table(name = "attributes")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attribute extends BaseEntity implements Auditable {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 60)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttributeType type;

    @Column(length = 20)
    private String unit;

    @Column(nullable = false)
    @Builder.Default
    private Boolean filterable = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @OneToMany(mappedBy = "attribute", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<AttributeOption> options = new ArrayList<>();

    @Override
    public String getEntityName() {
        return "Attribute";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("name", this.name);
        map.put("code", this.code);
        map.put("type", this.type);
        map.put("unit", this.unit);
        map.put("filterable", this.filterable);
        map.put("sortOrder", this.sortOrder);
        map.put("active", this.active);
        if (this.options != null) {
            map.put("optionsCount", this.options.size());
        }
        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
