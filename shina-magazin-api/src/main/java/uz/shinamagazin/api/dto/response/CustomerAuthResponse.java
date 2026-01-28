package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Customer;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAuthResponse {
    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private CustomerProfileResponse customer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerProfileResponse {
        private Long id;
        private String fullName;
        private String phone;
        private BigDecimal balance;
        private boolean hasDebt;
        private String preferredLanguage;

        public static CustomerProfileResponse from(Customer customer) {
            return CustomerProfileResponse.builder()
                    .id(customer.getId())
                    .fullName(customer.getFullName())
                    .phone(customer.getPhone())
                    .balance(customer.getBalance())
                    .hasDebt(customer.getBalance().compareTo(BigDecimal.ZERO) < 0)
                    .preferredLanguage(customer.getPreferredLanguage())
                    .build();
        }
    }
}
