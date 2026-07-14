package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "categories")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category extends BaseEntity implements Auditable {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<Category> children = new ArrayList<>();

    // Lucide ikonka nomi (admin/storefront menyusi uchun), masalan "car"
    @Column(length = 50)
    private String icon;

    // Forma shabloni (NULL = universal mahsulot); bola kategoriyalarga meros bo'ladi
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private uz.shinamagazin.api.enums.CategoryTemplate template;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Category";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("name", this.name);
        map.put("description", this.description);
        map.put("icon", this.icon);
        map.put("template", this.template);
        map.put("sortOrder", this.sortOrder);
        map.put("active", this.active);

        // Avoid lazy loading
        if (this.parent != null) {
            map.put("parentId", this.parent.getId());
        }
        if (this.children != null) {
            map.put("childrenCount", this.children.size());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
