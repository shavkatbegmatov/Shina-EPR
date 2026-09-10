package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.math.BigDecimal;

/**
 * Barter hujjatining bitta qatori: qabul qilingan shina va uning bahosi.
 *
 * <p>{@code product} — B/U mahsulot kartochkasi. Yangi shina kartochkasiga
 * kirim qilinmasligi kerak: tannarx "oxirgi kirim narxi" bo'yicha yangilanadi,
 * ya'ni 200 000 ga baholangan eski shina yangi shinaning tannarxini shu
 * summagacha tushirib, foyda hisobotini buzardi.
 */
@Entity
@Table(name = "trade_in_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeInItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trade_in_id", nullable = false)
    private TradeIn tradeIn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    /** Bitta shinaning baholangan narxi. */
    @Column(name = "unit_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitValue;

    @Column(name = "total_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalValue;

    /** Holati: "protektor 60%", "yon tomonida yorig'i bor" kabi qayd. */
    @Column(name = "condition_note", length = 200)
    private String conditionNote;
}
