package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.TradeInStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Barter hujjati — mijozdan qabul qilingan eski shinalar va ularning krediti.
 *
 * <p>Ikki yo'l bilan paydo bo'ladi:
 * <ul>
 *   <li>kassada savdo ichida ({@link #acceptedInSale} = true) — darhol
 *       {@link TradeInStatus#APPLIED};</li>
 *   <li>Barter sahifasida, savdodan oldin — mijoz shinasini qoldirib ketadi,
 *       hujjat {@link TradeInStatus#NEW} holatida kutadi va keyingi xaridda
 *       kassada tanlanadi.</li>
 * </ul>
 *
 * <p>Ikkala holda ham eski shinalar qabul paytidayoq omborga kiradi (shina
 * jismonan do'konda — qoldiq haqiqatni ko'rsatishi kerak). Kassaga pul
 * TUSHMAYDI: savdoda {@link #totalAmount} {@code sales.trade_in_amount} ga
 * yoziladi, {@code paid_amount} ga emas — Z-hisobot uni naqd deb sanamaydi.
 *
 * <p>Savdo bekor qilinganda taqdiri {@link #acceptedInSale} bilan hal bo'ladi:
 * savdo ichida qabul qilingan hujjat bekor bo'ladi (shinalar mijozga qaytadi),
 * oldindan qabul qilingani esa yana NEW ga qaytadi — mijozning krediti
 * saqlanadi, shinalar omborda qolaveradi.
 */
@Entity
@Table(name = "trade_ins")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeIn extends BaseEntity implements Auditable {

    @Column(name = "document_number", nullable = false, unique = true, length = 30)
    private String documentNumber;

    /** Eski shinalar kimdan olingani hujjatda qolishi shart. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    /** Qaysi savdoda ishlatilgan. NULL = hali ishlatilmagan. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    /** Kassada savdo ichida qabul qilinganmi (aks holda — Barter sahifasida, oldindan). */
    @Column(name = "accepted_in_sale", nullable = false)
    @Builder.Default
    private boolean acceptedInSale = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TradeInStatus status = TradeInStatus.NEW;

    /** Qabul qilingan shinalarning umumiy krediti — savdo summasidan shu ayiriladi. */
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

    public boolean isAvailable() {
        return status == TradeInStatus.NEW;
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "TradeIn";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("documentNumber", this.documentNumber);
        map.put("acceptedAt", this.acceptedAt);
        map.put("acceptedInSale", this.acceptedInSale);
        map.put("status", this.status);
        map.put("totalAmount", this.totalAmount);
        map.put("notes", this.notes);

        // Avoid lazy loading
        if (this.customer != null) {
            map.put("customerId", this.customer.getId());
        }
        if (this.sale != null) {
            map.put("saleId", this.sale.getId());
        }
        if (this.createdBy != null) {
            map.put("createdById", this.createdBy.getId());
        }
        if (this.items != null) {
            map.put("itemCount", this.items.size());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of();
    }
}
