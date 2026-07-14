package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.math.BigDecimal;

/**
 * Mahsulotning bitta atribut qiymati. MULTI_SELECT atributda bir mahsulotga
 * bir nechta qator (har tanlangan variant uchun bittadan) yoziladi.
 */
@Entity
@Table(name = "product_attribute_values")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductAttributeValue extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attribute_id", nullable = false)
    private Attribute attribute;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private AttributeOption option;

    @Column(name = "value_text", length = 500)
    private String valueText;

    @Column(name = "value_number", precision = 15, scale = 3)
    private BigDecimal valueNumber;

    @Column(name = "value_bool")
    private Boolean valueBool;
}
