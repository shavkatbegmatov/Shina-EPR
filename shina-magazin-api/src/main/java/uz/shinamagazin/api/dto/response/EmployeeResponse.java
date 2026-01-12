package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.enums.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponse {
    private Long id;

    // Asosiy maydonlar
    private String fullName;
    private String phone;
    private String email;
    private String position;
    private String department;
    private BigDecimal salary;
    private LocalDate hireDate;
    private EmployeeStatus status;

    // Kengaytirilgan maydonlar
    private LocalDate birthDate;
    private String passportNumber;
    private String address;
    private String bankAccountNumber;
    private String emergencyContactName;
    private String emergencyContactPhone;

    // User ma'lumotlari
    private Long userId;
    private String username;
    private String userRole;
    private Boolean hasUserAccount;

    /**
     * Credentials for newly created user account.
     * Only populated when a new user is created.
     * Shown only once - admin must communicate to employee.
     */
    private CredentialsInfo newCredentials;

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
                   .username(employee.getUser().getUsername())
                   .userRole(employee.getUser().getRole().name());
        }

        return builder.build();
    }
}
