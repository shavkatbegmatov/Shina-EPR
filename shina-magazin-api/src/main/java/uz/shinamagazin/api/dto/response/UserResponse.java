package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.User;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String role; // Changed from Role enum to String to support custom roles
    private Boolean active;

    public static UserResponse from(User user) {
        // Get role from new RBAC system (roles collection), fallback to legacy role field
        String roleCode;
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            // Use first role from RBAC system
            roleCode = user.getRoles().iterator().next().getCode();
        } else if (user.getRole() != null) {
            // Fallback to legacy role field
            roleCode = user.getRole().name();
        } else {
            roleCode = null;
        }

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(roleCode)
                .active(user.getActive())
                .build();
    }
}
