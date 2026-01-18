package uz.shinamagazin.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import uz.shinamagazin.api.audit.Auditable;
import uz.shinamagazin.api.audit.AuditEntityListener;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "employees")
@EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends BaseEntity implements Auditable {

    // Asosiy maydonlar
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String position;

    @Column(length = 100)
    private String department;

    @Column(precision = 15, scale = 2)
    private BigDecimal salary;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    // Kengaytirilgan maydonlar
    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "passport_number", length = 20)
    private String passportNumber;

    @Column(length = 300)
    private String address;

    @Column(name = "bank_account_number", length = 30)
    private String bankAccountNumber;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    // User bilan bog'lanish (login uchun)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    // ============================================
    // Auditable Interface Implementation
    // ============================================

    @Override
    public String getEntityName() {
        return "Employee";
    }

    @Override
    @JsonIgnore
    public Map<String, Object> toAuditMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("id", this.id);
        map.put("fullName", this.fullName);
        map.put("phone", this.phone);
        map.put("email", this.email);
        map.put("position", this.position);
        map.put("department", this.department);
        map.put("salary", this.salary);
        map.put("hireDate", this.hireDate);
        map.put("status", this.status);
        map.put("birthDate", this.birthDate);
        map.put("passportNumber", this.passportNumber);
        map.put("address", this.address);
        map.put("bankAccountNumber", this.bankAccountNumber); // Will be masked
        map.put("emergencyContactName", this.emergencyContactName);
        map.put("emergencyContactPhone", this.emergencyContactPhone);

        // Avoid lazy loading
        if (this.user != null) {
            map.put("userId", this.user.getId());
        }

        return map;
    }

    @Override
    public Set<String> getSensitiveFields() {
        return Set.of("bankAccountNumber");
    }
}
