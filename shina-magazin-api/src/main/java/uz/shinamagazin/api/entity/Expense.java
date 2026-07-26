package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Do'kon xarajati.
 *
 * <p>Sof foyda (P&amp;L) shu jadvalga tayanadi: ilgari tizim faqat yalpi
 * marjani bilardi, ijara/maosh/kommunal esa hech qayerda qayd etilmasdi.
 *
 * <p>{@code expenseDate} — xarajat SODIR BO'LGAN sana, {@code createdAt} esa
 * tizimga kiritilgan payt. Kassir kechagi xarajatni ertalab kiritishi mumkin,
 * P&amp;L esa uni kechaga yozishi kerak.
 */
@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense extends BaseEntity {

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExpenseCategory category;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    @Builder.Default
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    /**
     * Naqd xarajat qaysi smenada kassadan chiqqani.
     *
     * <p>Z-hisobotda kutilgan naqddan ayiriladi. {@code null} = kassadan
     * tashqari to'langan (masalan bank orqali) yoki ochiq smena bo'lmagan.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private CashShift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;
}
