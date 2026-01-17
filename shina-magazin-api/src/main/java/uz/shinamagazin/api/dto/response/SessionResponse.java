package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;
import uz.shinamagazin.api.entity.Session;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionResponse {
    private Long id;
    private String deviceType;
    private String browser;
    private String os;
    private String ipAddress;
    private String location;
    private LocalDateTime createdAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime expiresAt;
    private Boolean isCurrent; // Flag to identify current session

    public static SessionResponse from(Session session, boolean isCurrent) {
        return SessionResponse.builder()
                .id(session.getId())
                .deviceType(session.getDeviceType())
                .browser(session.getBrowser())
                .os(session.getOs())
                .ipAddress(session.getIpAddress())
                .location(session.getLocation())
                .createdAt(session.getCreatedAt())
                .lastActivityAt(session.getLastActivityAt())
                .expiresAt(session.getExpiresAt())
                .isCurrent(isCurrent)
                .build();
    }
}
