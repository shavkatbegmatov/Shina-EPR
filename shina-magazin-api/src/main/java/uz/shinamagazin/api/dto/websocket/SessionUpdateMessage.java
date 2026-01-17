package uz.shinamagazin.api.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket message for session updates (revocation, creation)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionUpdateMessage {

    /**
     * Type of session update: SESSION_REVOKED, SESSION_CREATED
     */
    private String type;

    /**
     * Session ID that was affected
     */
    private Long sessionId;

    /**
     * User ID who owns the session
     */
    private Long userId;

    /**
     * Reason for the update (e.g., "User logged out", "Admin revoked session")
     */
    private String reason;

    /**
     * Timestamp when the update occurred
     */
    private Long timestamp;

    public static SessionUpdateMessage sessionRevoked(Long sessionId, Long userId, String reason) {
        return SessionUpdateMessage.builder()
                .type("SESSION_REVOKED")
                .sessionId(sessionId)
                .userId(userId)
                .reason(reason)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    public static SessionUpdateMessage sessionCreated(Long sessionId, Long userId) {
        return SessionUpdateMessage.builder()
                .type("SESSION_CREATED")
                .sessionId(sessionId)
                .userId(userId)
                .reason("New login")
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
