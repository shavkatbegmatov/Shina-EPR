package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "sales")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale extends BaseEntity implements Auditable {

    @Column(name = "invoice_number", nullable = false, unique = true, length = 30)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "sale_date", nullable = false)
    private LocalDateTime saleDate;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "debt_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal debtAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SaleStatus status = SaleStatus.COMPLETED;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SaleItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    // Helper: element qo'shish
    public void addItem(SaleItem item) {
        items.add(item);
        item.setSale(this);
    }

    // Helper: to'lov qo'shish
    public void addPayment(Payment payment) {
        payments.add(payment);
        payment.setSale(this);
    }

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Sale";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", getId());
        map.put("invoiceNumber", this.invoiceNumber);
        map.put("saleDate", this.saleDate);
        map.put("subtotal", this.subtotal);
        map.put("discountAmount", this.discountAmount);
        map.put("discountPercent", this.discountPercent);
        map.put("totalAmount", this.totalAmount);
        map.put("paidAmount", this.paidAmount);
        map.put("debtAmount", this.debtAmount);
        map.put("paymentMethod", this.paymentMethod);
        map.put("paymentStatus", this.paymentStatus);
        map.put("status", this.status);
        map.put("notes", this.notes);

        // Avoid lazy loading
        if (this.customer != null) {
            map.put("customerId", this.customer.getId());
        }
        if (this.createdBy != null) {
            map.put("createdById", this.createdBy.getId());
        }
        if (this.items != null) {
            map.put("itemCount", this.items.size());
        }
        if (this.payments != null) {
            map.put("paymentCount", this.payments.size());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of(); // No sensitive fields
    }
}
