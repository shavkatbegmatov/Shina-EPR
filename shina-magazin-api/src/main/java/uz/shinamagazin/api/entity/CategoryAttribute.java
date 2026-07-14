package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

/**
 * Kategoriya <-> atribut bog'lanishi. Bola kategoriyalar ota kategoriya
 * atributlarini meros qilib oladi (effektiv ro'yxat serviceda yig'iladi).
 */
@Entity
@Table(name = "category_attributes",
        uniqueConstraints = @UniqueConstraint(name = "uq_category_attribute", columnNames = {"category_id", "attribute_id"}))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryAttribute extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attribute_id", nullable = false)
    private Attribute attribute;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
