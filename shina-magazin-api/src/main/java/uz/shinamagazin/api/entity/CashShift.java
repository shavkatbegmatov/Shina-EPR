package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.CashShiftStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Kassa smenasi.
 *
 * <p>Smena ochilganda kassadagi mayda pul ({@code openingFloat}) qayd etiladi,
 * savdolar smenaga bog'lanadi, yopilganda esa kassir sanagan naqd pul
 * ({@code countedCash}) tizim kutgan summa bilan solishtiriladi.
 *
 * <p>{@code expectedCash} va {@code difference} yopish paytida HISOBLANIB
 * SAQLANADI. Keyinchalik savdo bekor qilinsa ham Z-hisobot o'sha paytdagi
 * haqiqatni ko'rsatishi kerak — aks holda kamomad "o'z-o'zidan yo'qolardi".
 */
@Entity
@Table(name = "cash_shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashShift extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "opened_by", nullable = false)
    private User openedBy;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "opening_float", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal openingFloat = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "counted_cash", precision = 15, scale = 2)
    private BigDecimal countedCash;

    @Column(name = "expected_cash", precision = 15, scale = 2)
    private BigDecimal expectedCash;

    /** {@code countedCash - expectedCash}: musbat = ortiqcha, manfiy = kamomad. */
    @Column(name = "difference", precision = 15, scale = 2)
    private BigDecimal difference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CashShiftStatus status = CashShiftStatus.OPEN;

    @Column(length = 500)
    private String notes;

    public boolean isOpen() {
        return status == CashShiftStatus.OPEN;
    }
}
