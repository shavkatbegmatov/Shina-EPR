package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Detailed audit log response with parsed field changes and device info
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDetailResponse {
    // Basic info
    private Long id;
    private String entityType;
    private Long entityId;
    private String action;
    private LocalDateTime createdAt;

    // User info
    private String username;
    private Long userId;
    private String ipAddress;

    // Device info (parsed)
    private DeviceInfo deviceInfo;

    // Field changes (structured)
    private List<FieldChange> fieldChanges;

    // Raw JSON (for technical view)
    private Map<String, Object> oldValue;
    private Map<String, Object> newValue;

    // Entity metadata
    private String entityName; // Friendly name for display
    private String entityLink; // URL to view entity (if exists)

    /**
     * Individual field change detail
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldChange {
        private String fieldName;          // Database field name
        private String fieldLabel;         // Uzbek label (Narx, Nomi, etc.)
        private Object oldValue;
        private Object newValue;
        private ChangeType changeType;     // ADDED, REMOVED, MODIFIED, UNCHANGED
        private FieldType fieldType;       // STRING, NUMBER, CURRENCY, DATE, BOOLEAN, ENUM
        private boolean isSensitive;       // Sensitive data flag

        // Formatted values
        private String oldValueFormatted;
        private String newValueFormatted;
    }

    /**
     * Parsed device and browser information
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceInfo {
        private String deviceType;         // Mobile, Tablet, Desktop
        private String browser;            // Chrome, Firefox, Safari, Edge
        private String browserVersion;
        private String os;                 // Windows, macOS, iOS, Android, Linux
        private String osVersion;
        private String userAgent;          // Raw User-Agent
    }

    /**
     * Type of change for a field
     */
    public enum ChangeType {
        ADDED,      // Field was added (only in newValue)
        REMOVED,    // Field was removed (only in oldValue)
        MODIFIED,   // Field value changed
        UNCHANGED   // For reference (optional)
    }

    /**
     * Field data type for formatting
     */
    public enum FieldType {
        STRING, NUMBER, CURRENCY, DATE, DATETIME, BOOLEAN, ENUM, JSON
    }
}
