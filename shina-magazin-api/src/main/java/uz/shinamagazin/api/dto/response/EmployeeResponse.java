package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.enums.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Xodimlar",
    title = "Xodimlar Hisoboti"
)
public class EmployeeResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    // Asosiy maydonlar
    @ExportColumn(header = "F.I.SH", order = 2)
    private String fullName;

    @ExportColumn(header = "Telefon", order = 3)
    private String phone;

    @ExportColumn(header = "Email", order = 4)
    private String email;

    @ExportColumn(header = "Lavozim", order = 5)
    private String position;

    @ExportColumn(header = "Bo'lim", order = 6)
    private String department;

    @ExportColumn(header = "Maosh", order = 7, type = ColumnType.CURRENCY, sensitive = true)
    private BigDecimal salary;

    @ExportColumn(header = "Ishga qabul sanasi", order = 8, type = ColumnType.DATE)
    private LocalDate hireDate;

    @ExportColumn(header = "Holat", order = 9, type = ColumnType.ENUM)
    private EmployeeStatus status;

    // Kengaytirilgan maydonlar
    @ExportColumn(header = "Tug'ilgan sana", order = 10, type = ColumnType.DATE)
    private LocalDate birthDate;

    @ExportColumn(header = "Pasport raqami", order = 11, sensitive = true)
    private String passportNumber;

    @ExportColumn(header = "Manzil", order = 12)
    private String address;

    @ExportColumn(header = "Bank hisob raqami", order = 13, sensitive = true)
    private String bankAccountNumber;

    @ExportColumn(header = "Favqulodda aloqa", order = 14)
    private String emergencyContactName;

    @ExportColumn(header = "Favqulodda telefon", order = 15)
    private String emergencyContactPhone;

    // User ma'lumotlari
    private Long userId; // Not exported

    @ExportColumn(header = "Foydalanuvchi nomi", order = 16)
    private String username;

    @ExportColumn(header = "Rol", order = 17)
    private String userRole;

    @ExportColumn(header = "Hisob bormi", order = 18, type = ColumnType.BOOLEAN)
    private Boolean hasUserAccount;

    /**
     * Credentials for newly created user account.
     * Only populated when a new user is created.
     * Shown only once - admin must communicate to employee.
     */
    private CredentialsInfo newCredentials; // Not exported

    public static EmployeeResponse from(Employee employee) {
        EmployeeResponseBuilder builder = EmployeeResponse.builder()
                .id(employee.getId())
                .fullName(employee.getFullName())
                .phone(employee.getPhone())
                .email(employee.getEmail())
                .position(employee.getPosition())
                .department(employee.getDepartment())
                .salary(employee.getSalary())
                .hireDate(employee.getHireDate())
                .status(employee.getStatus())
                .birthDate(employee.getBirthDate())
                .passportNumber(employee.getPassportNumber())
                .address(employee.getAddress())
                .bankAccountNumber(employee.getBankAccountNumber())
                .emergencyContactName(employee.getEmergencyContactName())
                .emergencyContactPhone(employee.getEmergencyContactPhone())
                .hasUserAccount(employee.getUser() != null);

        if (employee.getUser() != null) {
            builder.userId(employee.getUser().getId())
                   .username(employee.getUser().getUsername());

            // Get role from new RBAC system (roles collection), fallback to legacy role field
            if (!employee.getUser().getRoles().isEmpty()) {
                builder.userRole(employee.getUser().getRoles().iterator().next().getCode());
            } else {
                builder.userRole(employee.getUser().getRole().name());
            }
        }

        return builder.build();
    }
}
