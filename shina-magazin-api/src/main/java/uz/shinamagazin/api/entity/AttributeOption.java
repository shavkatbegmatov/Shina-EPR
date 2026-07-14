package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

/**
 * SELECT / MULTI_SELECT atribut uchun tanlov varianti (masalan "Asfalt", "Universal").
 */
@Entity
@Table(name = "attribute_options",
        uniqueConstraints = @UniqueConstraint(name = "uq_attribute_option", columnNames = {"attribute_id", "value"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttributeOption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attribute_id", nullable = false)
    private Attribute attribute;

    @Column(nullable = false, length = 120)
    private String value;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
