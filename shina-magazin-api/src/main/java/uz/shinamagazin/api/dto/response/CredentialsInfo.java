package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response containing newly created user credentials.
 * Used when creating user accounts for employees.
 * Credentials are shown only once and should be communicated to the employee.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialsInfo {

    /**
     * Auto-generated username (e.g., a.karimov)
     */
    private String username;

    /**
     * Temporary password that must be changed on first login
     */
    private String temporaryPassword;

    /**
     * Warning message about one-time display
     */
    private String message;

    /**
     * Flag indicating password must be changed
     */
    private Boolean mustChangePassword;
}
