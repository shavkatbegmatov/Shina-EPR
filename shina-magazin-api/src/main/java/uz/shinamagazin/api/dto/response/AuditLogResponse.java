package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private String entityType;
    private Long entityId;
    private String action;
    private Map<String, Object> oldValue;
    private Map<String, Object> newValue;
    private Long userId;
    private String username;
    private String ipAddress;
    private String userAgent;
    private UUID correlationId;
    private LocalDateTime createdAt;

    public static AuditLogResponse from(AuditLog auditLog) {
        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .action(auditLog.getAction())
                .oldValue(auditLog.getOldValue())
                .newValue(auditLog.getNewValue())
                .userId(auditLog.getUserId())
                .username(auditLog.getUsername())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .correlationId(auditLog.getCorrelationId())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }
}
