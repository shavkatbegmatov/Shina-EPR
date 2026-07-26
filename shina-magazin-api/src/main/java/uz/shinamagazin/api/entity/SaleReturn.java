package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Savdo qaytarish — qisman yoki to'liq.
 *
 * <p>{@code cancelSale} dan farqi: u butun savdoni XATO deb bekor qiladi.
 * Qaytarish esa keyinroq sodir bo'ladi, qisman bo'lishi mumkin va kassadan
 * haqiqiy pul chiqadi.
 *
 * <p>Pul ikkiga bo'linadi: avval mijozning shu savdo bo'yicha QARZI
 * kamaytiriladi (pul chiqmaydi), qolgani naqd qaytariladi. Aks holda qarzga
 * olgan mijoz tovarni qaytarib, ustiga naqd pul ham olib ketardi.
 */
@Entity
@Table(name = "sale_returns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleReturn extends BaseEntity {

    @Column(name = "return_number", nullable = false, unique = true, length = 30)
    private String returnNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @Column(name = "return_date", nullable = false)
    private LocalDateTime returnDate;

    @Column(length = 500)
    private String reason;

    @Column(name = "refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal refundAmount;

    /** Qarzni kamaytirishga ketgan qism — kassadan pul chiqmagan. */
    @Column(name = "debt_reduced", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal debtReduced = BigDecimal.ZERO;

    /** Mijozga haqiqatan qaytarilgan pul — Z-hisobotda naqd chiqimi. */
    @Column(name = "cash_refunded", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal cashRefunded = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private CashShift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "saleReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SaleReturnItem> items = new ArrayList<>();

    public void addItem(SaleReturnItem item) {
        items.add(item);
        item.setSaleReturn(this);
    }
}
