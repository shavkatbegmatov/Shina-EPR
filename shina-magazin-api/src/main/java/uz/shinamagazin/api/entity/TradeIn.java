package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.TradeInStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Barter hujjati — mijozdan qabul qilingan eski shinalar va ularning bahosi.
 *
 * <p>Chegirmadan farqi ikkita. Birinchisi: chegirma pul yo'qotish, barter esa
 * TOVAR OLISH — qabul qilingan shinalar omborga b/u tovar sifatida kiradi va
 * keyin qayta sotiladi. Ikkinchisi: baholash savdodan alohida bo'lishi mumkin,
 * mijoz shinasini bugun qoldirib, xaridni keyinroq qiladi. Shuning uchun
 * {@code sale} NULL bo'la oladi va hujjat {@link TradeInStatus#NEW} holatida
 * kutib turadi.
 *
 * <p>Kassaga pul TUSHMAYDI: savdoda bu summa {@code sales.trade_in_amount} ga
 * yoziladi, {@code paid_amount} ga emas. Aks holda Z-hisobot uni naqd deb
 * sanab, kassirga baho summasicha soxta ortiqcha yozardi.
 */
@Entity
@Table(name = "trade_ins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeIn extends BaseEntity {

    @Column(name = "document_number", nullable = false, unique = true, length = 30)
    private String documentNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    /** Qaysi savdoda ishlatilgan. NULL = hali ishlatilmagan. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TradeInStatus status = TradeInStatus.NEW;

    /** Qabul qilingan shinalarning umumiy bahosi — savdo summasidan shu ayiriladi. */
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(length = 500)
    private String notes;

    /**
     * Qaysi smenada qabul qilingan.
     *
     * <p>Savdodagidek NULL bo'lishi mumkin: ochiq smena yo'qligi uchun barter
     * qabuli bloklanmaydi.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private CashShift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "tradeIn", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TradeInItem> items = new ArrayList<>();

    public void addItem(TradeInItem item) {
        items.add(item);
        item.setTradeIn(this);
    }
}
