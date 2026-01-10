package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.enums.CustomerType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerPortalProfileResponse {
    private Long id;
    private String fullName;
    private String phone;
    private String phone2;
    private String address;
    private String companyName;
    private CustomerType customerType;
    private BigDecimal balance;
    private boolean hasDebt;
    private String preferredLanguage;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public static CustomerPortalProfileResponse from(Customer customer) {
        return CustomerPortalProfileResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .phone2(customer.getPhone2())
                .address(customer.getAddress())
                .companyName(customer.getCompanyName())
                .customerType(customer.getCustomerType())
                .balance(customer.getBalance())
                .hasDebt(customer.getBalance().compareTo(BigDecimal.ZERO) < 0)
                .preferredLanguage(customer.getPreferredLanguage())
                .lastLoginAt(customer.getLastLoginAt())
                .createdAt(customer.getCreatedAt())
                .build();
    }
}
