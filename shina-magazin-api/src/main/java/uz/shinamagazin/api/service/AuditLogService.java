package uz.shinamagazin.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.dto.response.UserActivityResponse;
import uz.shinamagazin.api.entity.AuditLog;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.repository.AuditLogRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Log an audit event asynchronously
     */
    @Async
    @Transactional
    public void log(String entityType, Long entityId, String action, Object oldValue, Object newValue, Long userId) {
        try {
            String username = null;
            if (userId != null) {
                username = userRepository.findById(userId)
                        .map(User::getUsername)
                        .orElse(null);
            }

            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();

            AuditLog auditLog = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .oldValue(convertToMap(oldValue))
                    .newValue(convertToMap(newValue))
                    .userId(userId)
                    .username(username)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            auditLogRepository.save(auditLog);
            log.debug("Audit log created: {} {} {} by {}", action, entityType, entityId, username);
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage(), e);
        }
    }

    /**
     * Log without old value (for CREATE operations)
     */
    @Async
    @Transactional
    public void logCreate(String entityType, Long entityId, Object newValue, Long userId) {
        log(entityType, entityId, "CREATE", null, newValue, userId);
    }

    /**
     * Log update operation
     */
    @Async
    @Transactional
    public void logUpdate(String entityType, Long entityId, Object oldValue, Object newValue, Long userId) {
        log(entityType, entityId, "UPDATE", oldValue, newValue, userId);
    }

    /**
     * Log delete operation
     */
    @Async
    @Transactional
    public void logDelete(String entityType, Long entityId, Object oldValue, Long userId) {
        log(entityType, entityId, "DELETE", oldValue, null, userId);
    }

    /**
     * Log an audit event in a new transaction.
     * This method ensures that audit logs are persisted even if the main transaction rolls back.
     * Uses REQUIRES_NEW propagation to create a new transaction independent of the calling code.
     *
     * <p>This is particularly useful for:</p>
     * <ul>
     *   <li>Critical audit events that must be recorded regardless of transaction outcome</li>
     *   <li>Operations that might be rolled back due to validation errors</li>
     *   <li>Ensuring audit trail completeness for compliance purposes</li>
     * </ul>
     *
     * @param entityType the type of entity (e.g., "User", "Product")
     * @param entityId the ID of the entity
     * @param action the action performed (CREATE, UPDATE, DELETE)
     * @param oldValue the old state of the entity (null for CREATE)
     * @param newValue the new state of the entity (null for DELETE)
     * @param userId the ID of the user who performed the action
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logInNewTransaction(String entityType, Long entityId, String action,
                                     Object oldValue, Object newValue, Long userId) {
        try {
            String username = null;
            if (userId != null) {
                username = userRepository.findById(userId)
                        .map(User::getUsername)
                        .orElse(null);
            }

            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();

            AuditLog auditLog = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .oldValue(convertToMap(oldValue))
                    .newValue(convertToMap(newValue))
                    .userId(userId)
                    .username(username)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            auditLogRepository.save(auditLog);
            log.debug("Audit log created in new transaction: {} {} {} by {}",
                    action, entityType, entityId, username);
        } catch (Exception e) {
            log.error("Failed to create audit log in new transaction: {}", e.getMessage(), e);
        }
    }

    /**
     * Get audit logs for an entity
     */
    public List<AuditLogResponse> getEntityAuditLogs(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream()
                .map(AuditLogResponse::from)
                .toList();
    }

    /**
     * Search audit logs with filters
     */
    public Page<AuditLogResponse> searchAuditLogs(
            String entityType,
            String action,
            Long userId,
            String search,
            Pageable pageable
    ) {
        return auditLogRepository.searchAuditLogs(entityType, action, userId, search, pageable)
                .map(AuditLogResponse::from);
    }

    /**
     * Get audit logs by user
     */
    public Page<AuditLogResponse> getAuditLogsByUser(Long userId, Pageable pageable) {
        return auditLogRepository.findByUserId(userId, pageable)
                .map(AuditLogResponse::from);
    }

    /**
     * Get user activity with filters for activity history feature
     *
     * @param userId the ID of the user whose activity to retrieve
     * @param entityType optional filter by entity type (e.g., "Product", "Sale")
     * @param action optional filter by action (CREATE, UPDATE, DELETE)
     * @param startDate optional filter by start date
     * @param endDate optional filter by end date
     * @param pageable pagination parameters
     * @return Page of UserActivityResponse with human-readable descriptions
     */
    public Page<UserActivityResponse> getUserActivity(
            Long userId,
            String entityType,
            String action,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable
    ) {
        Page<AuditLog> auditLogs;

        if (startDate != null && endDate != null) {
            // Filter by date range and user
            auditLogs = auditLogRepository.findByUserIdAndDateRange(
                userId, startDate, endDate, pageable
            );
        } else {
            // Use search method with filters
            auditLogs = auditLogRepository.searchAuditLogs(
                entityType, action, userId, null, pageable
            );
        }

        return auditLogs.map(UserActivityResponse::from);
    }

    /**
     * Get audit logs by date range
     */
    public Page<AuditLogResponse> getAuditLogsByDateRange(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable
    ) {
        return auditLogRepository.findByDateRange(startDate, endDate, pageable)
                .map(AuditLogResponse::from);
    }

    /**
     * Get all entity types in audit logs
     */
    public List<String> getAllEntityTypes() {
        return auditLogRepository.findAllEntityTypes();
    }

    /**
     * Get all actions in audit logs
     */
    public List<String> getAllActions() {
        return auditLogRepository.findAllActions();
    }

    /**
     * Clean up old audit logs
     */
    @Transactional
    public void cleanupOldLogs(int daysToKeep) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        auditLogRepository.deleteByCreatedAtBefore(cutoffDate);
        log.info("Cleaned up audit logs older than {} days", daysToKeep);
    }

    private Map<String, Object> convertToMap(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String) {
            return Map.of("value", obj);
        }
        try {
            return objectMapper.convertValue(obj, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to convert object to map: {}", e.getMessage());
            return Map.of("value", obj.toString());
        }
    }

    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                    return xForwardedFor.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            log.debug("Could not get client IP address: {}", e.getMessage());
        }
        return null;
    }

    private String getUserAgent() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                return request.getHeader("User-Agent");
            }
        } catch (Exception e) {
            log.debug("Could not get user agent: {}", e.getMessage());
        }
        return null;
    }
}
