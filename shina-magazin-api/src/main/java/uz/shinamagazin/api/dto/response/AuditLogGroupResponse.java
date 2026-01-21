package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for grouped audit logs.
 * Groups related audit logs that were created as part of a single operation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogGroupResponse {

    /**
     * Correlation ID that groups these logs (null for time-based grouping)
     */
    private UUID correlationId;

    /**
     * Unique key for this group (correlationId or timestamp_userId)
     */
    private String groupKey;

    /**
     * Timestamp of the first (most recent) log in the group
     */
    private LocalDateTime timestamp;

    /**
     * Username who performed the operation
     */
    private String username;

    /**
     * Human-readable primary action description (e.g., "Qarz to'lash", "Sotuv yaratish")
     */
    private String primaryAction;

    /**
     * Summary of changes (e.g., "4 ta o'zgarish: Payment, Debt, Customer, Sale")
     */
    private String summary;

    /**
     * Number of logs in this group
     */
    private int logCount;

    /**
     * Individual audit logs in this group
     */
    private List<AuditLogResponse> logs;

    /**
     * List of unique entity types in this group
     */
    private List<String> entityTypes;
}
