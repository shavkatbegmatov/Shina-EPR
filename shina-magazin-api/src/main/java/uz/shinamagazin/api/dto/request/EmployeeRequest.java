package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequest {

    // Asosiy maydonlar
    @NotBlank(message = "Ism familiya kiritilishi shart")
    @Size(max = 150, message = "Ism familiya 150 ta belgidan oshmasligi kerak")
    private String fullName;

    @NotBlank(message = "Telefon raqam kiritilishi shart")
    @Pattern(regexp = "^\\+998[0-9]{9}$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String phone;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100, message = "Email 100 ta belgidan oshmasligi kerak")
    private String email;

    @NotBlank(message = "Lavozim kiritilishi shart")
    @Size(max = 100, message = "Lavozim 100 ta belgidan oshmasligi kerak")
    private String position;

    @Size(max = 100, message = "Bo'lim nomi 100 ta belgidan oshmasligi kerak")
    private String department;

    @DecimalMin(value = "0.0", message = "Maosh manfiy bo'lishi mumkin emas")
    private BigDecimal salary;

    @NotNull(message = "Ishga qabul sanasi kiritilishi shart")
    private LocalDate hireDate;

    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    // Kengaytirilgan maydonlar
    private LocalDate birthDate;

    @Size(max = 20, message = "Pasport raqami 20 ta belgidan oshmasligi kerak")
    private String passportNumber;

    @Size(max = 300, message = "Manzil 300 ta belgidan oshmasligi kerak")
    private String address;

    @Size(max = 30, message = "Bank hisob raqami 30 ta belgidan oshmasligi kerak")
    private String bankAccountNumber;

    @Size(max = 100, message = "Favqulodda aloqa ismi 100 ta belgidan oshmasligi kerak")
    private String emergencyContactName;

    @Pattern(regexp = "^(\\+998[0-9]{9})?$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String emergencyContactPhone;

    // User bog'lanish (ixtiyoriy)
    private Long userId;
}
