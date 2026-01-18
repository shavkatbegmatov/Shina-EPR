package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityResponse {
    private Long id;
    private String action;
    private String entityType;
    private Long entityId;
    private String description; // Human-readable description
    private Map<String, Object> changes; // Only changed fields
    private String ipAddress;
    private String deviceType;
    private String browser;
    private LocalDateTime timestamp;

    public static UserActivityResponse from(AuditLog auditLog) {
        // Extract device type and browser from userAgent
        String deviceType = extractDeviceType(auditLog.getUserAgent());
        String browser = extractBrowser(auditLog.getUserAgent());

        // Calculate changes (only fields that actually changed)
        Map<String, Object> changes = calculateChanges(
            auditLog.getOldValue(),
            auditLog.getNewValue()
        );

        // Generate human-readable description
        String description = generateDescription(
            auditLog.getAction(),
            auditLog.getEntityType(),
            auditLog.getEntityId(),
            changes
        );

        return UserActivityResponse.builder()
                .id(auditLog.getId())
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .description(description)
                .changes(changes)
                .ipAddress(auditLog.getIpAddress())
                .deviceType(deviceType)
                .browser(browser)
                .timestamp(auditLog.getCreatedAt())
                .build();
    }

    private static Map<String, Object> calculateChanges(
        Map<String, Object> oldValue,
        Map<String, Object> newValue
    ) {
        Map<String, Object> changes = new HashMap<>();

        if (oldValue == null && newValue != null) {
            // CREATE operation - all new values are changes
            return newValue;
        }

        if (oldValue != null && newValue != null) {
            // UPDATE operation - only include changed fields
            newValue.forEach((key, value) -> {
                Object oldVal = oldValue.get(key);
                if (oldVal == null && value != null) {
                    changes.put(key, Map.of("old", null, "new", value));
                } else if (oldVal != null && !oldVal.equals(value)) {
                    changes.put(key, Map.of("old", oldVal, "new", value));
                }
            });
        }

        if (oldValue != null && newValue == null) {
            // DELETE operation - show what was deleted
            return oldValue;
        }

        return changes;
    }

    private static String generateDescription(
        String action,
        String entityType,
        Long entityId,
        Map<String, Object> changes
    ) {
        // Generate human-readable description in Uzbek
        switch (action) {
            case "CREATE":
                return entityType + " yaratildi (ID: " + entityId + ")";
            case "UPDATE":
                String changedFields = String.join(", ", changes.keySet());
                return entityType + " o'zgartirildi: " + changedFields + " (ID: " + entityId + ")";
            case "DELETE":
                return entityType + " o'chirildi (ID: " + entityId + ")";
            default:
                return entityType + " - " + action + " (ID: " + entityId + ")";
        }
    }

    private static String extractDeviceType(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")) {
            return "Mobile";
        } else if (ua.contains("tablet") || ua.contains("ipad")) {
            return "Tablet";
        } else {
            return "Desktop";
        }
    }

    private static String extractBrowser(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        if (ua.contains("edg")) return "Edge";
        if (ua.contains("chrome")) return "Chrome";
        if (ua.contains("firefox")) return "Firefox";
        if (ua.contains("safari") && !ua.contains("chrome")) return "Safari";
        if (ua.contains("opera") || ua.contains("opr")) return "Opera";
        return "Unknown";
    }
}
