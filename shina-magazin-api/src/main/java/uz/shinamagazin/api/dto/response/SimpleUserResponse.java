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
public class SimpleUserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Boolean active;

    public static SimpleUserResponse from(User user) {
        return SimpleUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .active(user.getActive())
                .build();
    }
}
