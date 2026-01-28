package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;
import uz.shinamagazin.api.entity.LoginAttempt;

import java.time.LocalDateTime;

@Data
@Builder
public class LoginAttemptResponse {
    private Long id;
    private String username;
    private String ipAddress;
    private String deviceType;
    private String browser;
    private String os;
    private String location;
    private String status; // SUCCESS, FAILED
    private String failureReason;
    private LocalDateTime createdAt;

    public static LoginAttemptResponse from(LoginAttempt attempt) {
        return LoginAttemptResponse.builder()
                .id(attempt.getId())
                .username(attempt.getUsername())
                .ipAddress(attempt.getIpAddress())
                .deviceType(attempt.getDeviceType())
                .browser(attempt.getBrowser())
                .os(attempt.getOs())
                .location(attempt.getLocation())
                .status(attempt.getStatus().name())
                .failureReason(attempt.getFailureReason() != null ? attempt.getFailureReason().name() : null)
                .createdAt(attempt.getCreatedAt())
                .build();
    }
}
