package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for changing user password.
 * Used for both first-time password change and regular password change.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Joriy parol kiritilishi shart")
    private String currentPassword;

    @NotBlank(message = "Yangi parol kiritilishi shart")
    @Size(min = 6, max = 100, message = "Parol 6-100 belgi oralig'ida bo'lishi kerak")
    private String newPassword;

    @NotBlank(message = "Parolni tasdiqlash kiritilishi shart")
    private String confirmPassword;
}
