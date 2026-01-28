package uz.shinamagazin.api.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionUpdateMessage {
    /**
     * Updated permissions for the user
     */
    private Set<String> permissions;

    /**
     * Updated roles for the user
     */
    private Set<String> roles;

    /**
     * Reason for the update (optional, for logging)
     */
    private String reason;

    /**
     * Timestamp of the update
     */
    private Long timestamp;
}
