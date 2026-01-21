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
import uz.shinamagazin.api.dto.response.AuditLogDetailResponse;
import uz.shinamagazin.api.dto.response.AuditLogGroupResponse;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.dto.response.UserActivityResponse;
import uz.shinamagazin.api.entity.AuditLog;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.AuditLogRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final FieldLabelService fieldLabelService;

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
     * Log CREATE operation with explicit IP address and user agent (from entity listener)
     */
    @Async
    @Transactional
    public void logCreateWithContext(String entityType, Long entityId, Object newValue, Long userId,
                                      String ipAddress, String userAgent, UUID correlationId) {
        logWithContext(entityType, entityId, "CREATE", null, newValue, userId, ipAddress, userAgent, correlationId);
    }

    /**
     * Log UPDATE operation with explicit IP address and user agent (from entity listener)
     */
    @Async
    @Transactional
    public void logUpdateWithContext(String entityType, Long entityId, Object oldValue, Object newValue,
                                      Long userId, String ipAddress, String userAgent, UUID correlationId) {
        logWithContext(entityType, entityId, "UPDATE", oldValue, newValue, userId, ipAddress, userAgent, correlationId);
    }

    /**
     * Log DELETE operation with explicit IP address and user agent (from entity listener)
     */
    @Async
    @Transactional
    public void logDeleteWithContext(String entityType, Long entityId, Object oldValue, Long userId,
                                      String ipAddress, String userAgent, UUID correlationId) {
        logWithContext(entityType, entityId, "DELETE", oldValue, null, userId, ipAddress, userAgent, correlationId);
    }

    /**
     * Log an audit event with explicit IP and user agent (bypasses RequestContextHolder)
     */
    private void logWithContext(String entityType, Long entityId, String action, Object oldValue,
                                 Object newValue, Long userId, String ipAddress, String userAgent,
                                 UUID correlationId) {
        try {
            String username = null;
            if (userId != null) {
                username = userRepository.findById(userId)
                        .map(User::getUsername)
                        .orElse(null);
            }

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
                    .correlationId(correlationId)
                    .build();

            auditLogRepository.save(auditLog);
            log.debug("Audit log created with context: {} {} {} by {} from {} ({}) correlationId={}",
                    action, entityType, entityId, username, ipAddress, userAgent, correlationId);
        } catch (Exception e) {
            log.error("Failed to create audit log with context: {}", e.getMessage(), e);
        }
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
        String trimmedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();

        if (trimmedSearch == null) {
            return auditLogRepository.filterAuditLogs(entityType, action, userId, pageable)
                    .map(AuditLogResponse::from);
        }

        return auditLogRepository.searchAuditLogs(entityType, action, userId, trimmedSearch, pageable)
                .map(AuditLogResponse::from);
    }

    // ==================== GROUPED AUDIT LOGS ====================

    /**
     * Time window for grouping logs without correlation_id (in seconds)
     */
    private static final int GROUPING_TIME_WINDOW_SECONDS = 3;

    /**
     * Get grouped audit logs.
     * Groups by correlationId when available, otherwise by time window + userId.
     */
    public Page<AuditLogGroupResponse> searchGroupedAuditLogs(
            String entityType,
            String action,
            Long userId,
            String search,
            Pageable pageable
    ) {
        // Fetch more records than requested to account for grouping
        int fetchSize = pageable.getPageSize() * 5;
        int fetchPage = pageable.getPageNumber() * pageable.getPageSize() / fetchSize;
        Pageable fetchPageable = org.springframework.data.domain.PageRequest.of(
                fetchPage, fetchSize, pageable.getSort()
        );

        String trimmedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();

        List<AuditLog> auditLogs;
        long totalElements;

        if (trimmedSearch == null) {
            Page<AuditLog> page = auditLogRepository.filterAuditLogs(entityType, action, userId, fetchPageable);
            auditLogs = page.getContent();
            totalElements = page.getTotalElements();
        } else {
            Page<AuditLog> page = auditLogRepository.searchAuditLogs(entityType, action, userId, trimmedSearch, fetchPageable);
            auditLogs = page.getContent();
            totalElements = page.getTotalElements();
        }

        // Group the logs
        List<AuditLogGroupResponse> groups = groupAuditLogs(auditLogs);

        // Apply pagination to groups
        int start = (pageable.getPageNumber() * pageable.getPageSize()) % fetchSize;
        int end = Math.min(start + pageable.getPageSize(), groups.size());

        List<AuditLogGroupResponse> pageContent = start < groups.size()
                ? groups.subList(start, end)
                : Collections.emptyList();

        // Estimate total groups (roughly totalElements / average group size)
        long estimatedTotalGroups = groups.isEmpty() ? 0 : totalElements / Math.max(1, auditLogs.size() / groups.size());

        return new org.springframework.data.domain.PageImpl<>(
                pageContent,
                pageable,
                Math.max(estimatedTotalGroups, groups.size())
        );
    }

    /**
     * Group audit logs by correlation ID or time window
     */
    private List<AuditLogGroupResponse> groupAuditLogs(List<AuditLog> logs) {
        if (logs.isEmpty()) {
            return Collections.emptyList();
        }

        // Separate logs with and without correlation_id
        Map<UUID, List<AuditLog>> correlatedGroups = logs.stream()
                .filter(log -> log.getCorrelationId() != null)
                .collect(Collectors.groupingBy(AuditLog::getCorrelationId));

        List<AuditLog> uncorrelatedLogs = logs.stream()
                .filter(log -> log.getCorrelationId() == null)
                .toList();

        List<AuditLogGroupResponse> groups = new ArrayList<>();

        // Convert correlated groups
        for (Map.Entry<UUID, List<AuditLog>> entry : correlatedGroups.entrySet()) {
            groups.add(createGroupResponse(entry.getKey(), entry.getValue()));
        }

        // Group uncorrelated logs by time window and userId
        groups.addAll(groupByTimeWindow(uncorrelatedLogs));

        // Sort groups by timestamp (most recent first)
        groups.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));

        return groups;
    }

    /**
     * Group logs without correlation_id by time window and userId
     */
    private List<AuditLogGroupResponse> groupByTimeWindow(List<AuditLog> logs) {
        if (logs.isEmpty()) {
            return Collections.emptyList();
        }

        List<AuditLogGroupResponse> groups = new ArrayList<>();
        List<AuditLog> sorted = logs.stream()
                .sorted(Comparator.comparing(AuditLog::getCreatedAt).reversed())
                .toList();

        List<AuditLog> currentGroup = new ArrayList<>();
        LocalDateTime groupStart = null;
        Long groupUserId = null;

        for (AuditLog log : sorted) {
            if (groupStart == null) {
                // Start new group
                currentGroup.add(log);
                groupStart = log.getCreatedAt();
                groupUserId = log.getUserId();
            } else {
                long secondsDiff = ChronoUnit.SECONDS.between(log.getCreatedAt(), groupStart);
                boolean sameUser = Objects.equals(log.getUserId(), groupUserId);

                if (secondsDiff <= GROUPING_TIME_WINDOW_SECONDS && sameUser) {
                    // Add to current group
                    currentGroup.add(log);
                } else {
                    // Close current group and start new one
                    groups.add(createGroupResponse(null, currentGroup));
                    currentGroup = new ArrayList<>();
                    currentGroup.add(log);
                    groupStart = log.getCreatedAt();
                    groupUserId = log.getUserId();
                }
            }
        }

        // Don't forget the last group
        if (!currentGroup.isEmpty()) {
            groups.add(createGroupResponse(null, currentGroup));
        }

        return groups;
    }

    /**
     * Create a group response from a list of audit logs
     */
    private AuditLogGroupResponse createGroupResponse(UUID correlationId, List<AuditLog> logs) {
        if (logs.isEmpty()) {
            throw new IllegalArgumentException("Cannot create group from empty log list");
        }

        // Sort by createdAt descending
        List<AuditLog> sortedLogs = logs.stream()
                .sorted(Comparator.comparing(AuditLog::getCreatedAt).reversed())
                .toList();

        AuditLog firstLog = sortedLogs.get(0);

        // Get unique entity types
        List<String> entityTypes = sortedLogs.stream()
                .map(AuditLog::getEntityType)
                .distinct()
                .toList();

        // Determine primary action
        String primaryAction = determinePrimaryAction(sortedLogs);

        // Build summary
        String summary = buildGroupSummary(sortedLogs, entityTypes);

        // Generate group key for time-based groups
        String groupKey = correlationId != null
                ? correlationId.toString()
                : firstLog.getCreatedAt().toString() + "_" + firstLog.getUserId();

        return AuditLogGroupResponse.builder()
                .correlationId(correlationId)
                .groupKey(groupKey)
                .timestamp(firstLog.getCreatedAt())
                .username(firstLog.getUsername())
                .primaryAction(primaryAction)
                .summary(summary)
                .logCount(sortedLogs.size())
                .logs(sortedLogs.stream().map(AuditLogResponse::from).toList())
                .entityTypes(entityTypes)
                .build();
    }

    /**
     * Determine the primary action description for a group
     */
    private String determinePrimaryAction(List<AuditLog> logs) {
        Set<String> entityTypes = logs.stream()
                .map(AuditLog::getEntityType)
                .collect(Collectors.toSet());

        Set<String> actions = logs.stream()
                .map(AuditLog::getAction)
                .collect(Collectors.toSet());

        // Check for payment + debt combination (debt payment)
        if (entityTypes.contains("Payment") && entityTypes.contains("Debt")) {
            return "Qarz to'lash";
        }

        // Check for sale creation
        if (entityTypes.contains("Sale") && actions.contains("CREATE")) {
            if (entityTypes.contains("Payment") || entityTypes.contains("Debt")) {
                return "Sotuv yaratish";
            }
            return "Sotuv yaratish";
        }

        // Check for purchase order creation
        if (entityTypes.contains("PurchaseOrder") && actions.contains("CREATE")) {
            return "Xarid yaratish";
        }

        // Check for purchase payment
        if (entityTypes.contains("PurchasePayment")) {
            return "Xarid to'lovi";
        }

        // Check for stock movement
        if (entityTypes.contains("StockMovement")) {
            return "Ombor harakati";
        }

        // Single entity type operations
        if (entityTypes.size() == 1) {
            String entityType = entityTypes.iterator().next();
            String action = logs.get(0).getAction();

            return switch (entityType) {
                case "Product" -> switch (action) {
                    case "CREATE" -> "Mahsulot qo'shish";
                    case "UPDATE" -> "Mahsulot tahrirlash";
                    case "DELETE" -> "Mahsulot o'chirish";
                    default -> entityType + " " + action;
                };
                case "Customer" -> switch (action) {
                    case "CREATE" -> "Mijoz qo'shish";
                    case "UPDATE" -> "Mijoz tahrirlash";
                    case "DELETE" -> "Mijoz o'chirish";
                    default -> entityType + " " + action;
                };
                case "Employee" -> switch (action) {
                    case "CREATE" -> "Xodim qo'shish";
                    case "UPDATE" -> "Xodim tahrirlash";
                    case "DELETE" -> "Xodim o'chirish";
                    default -> entityType + " " + action;
                };
                case "Supplier" -> switch (action) {
                    case "CREATE" -> "Ta'minotchi qo'shish";
                    case "UPDATE" -> "Ta'minotchi tahrirlash";
                    case "DELETE" -> "Ta'minotchi o'chirish";
                    default -> entityType + " " + action;
                };
                case "User" -> switch (action) {
                    case "CREATE" -> "Foydalanuvchi yaratish";
                    case "UPDATE" -> "Foydalanuvchi tahrirlash";
                    case "DELETE" -> "Foydalanuvchi o'chirish";
                    default -> entityType + " " + action;
                };
                case "Role" -> switch (action) {
                    case "CREATE" -> "Rol yaratish";
                    case "UPDATE" -> "Rol tahrirlash";
                    case "DELETE" -> "Rol o'chirish";
                    default -> entityType + " " + action;
                };
                case "Brand" -> switch (action) {
                    case "CREATE" -> "Brend qo'shish";
                    case "UPDATE" -> "Brend tahrirlash";
                    case "DELETE" -> "Brend o'chirish";
                    default -> entityType + " " + action;
                };
                case "Category" -> switch (action) {
                    case "CREATE" -> "Kategoriya qo'shish";
                    case "UPDATE" -> "Kategoriya tahrirlash";
                    case "DELETE" -> "Kategoriya o'chirish";
                    default -> entityType + " " + action;
                };
                default -> getEntityTypeLabel(entityType) + " " + getActionLabel(action);
            };
        }

        // Multiple entity types - generic description
        return logs.size() + " ta o'zgarish";
    }

    /**
     * Build a summary string for the group
     */
    private String buildGroupSummary(List<AuditLog> logs, List<String> entityTypes) {
        if (logs.size() == 1) {
            AuditLog log = logs.get(0);
            return getEntityTypeLabel(log.getEntityType()) + " " + getActionLabel(log.getAction());
        }

        String entityTypesStr = entityTypes.stream()
                .map(this::getEntityTypeLabel)
                .collect(Collectors.joining(", "));

        return logs.size() + " ta o'zgarish: " + entityTypesStr;
    }

    /**
     * Get Uzbek label for entity type
     */
    private String getEntityTypeLabel(String entityType) {
        return switch (entityType) {
            case "Product" -> "Mahsulot";
            case "Sale" -> "Sotuv";
            case "Customer" -> "Mijoz";
            case "Payment" -> "To'lov";
            case "Debt" -> "Qarz";
            case "PurchaseOrder" -> "Xarid";
            case "PurchasePayment" -> "Xarid to'lovi";
            case "PurchaseReturn" -> "Xarid qaytarish";
            case "Supplier" -> "Ta'minotchi";
            case "Employee" -> "Xodim";
            case "User" -> "Foydalanuvchi";
            case "Role" -> "Rol";
            case "Brand" -> "Brend";
            case "Category" -> "Kategoriya";
            case "StockMovement" -> "Ombor harakati";
            default -> entityType;
        };
    }

    /**
     * Get Uzbek label for action
     */
    private String getActionLabel(String action) {
        return switch (action) {
            case "CREATE" -> "yaratildi";
            case "UPDATE" -> "o'zgartirildi";
            case "DELETE" -> "o'chirildi";
            default -> action;
        };
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
            auditLogs = auditLogRepository.filterAuditLogs(entityType, action, userId, pageable);
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

    // ==================== NEW METHODS FOR AUDIT LOG DETAIL VIEW ====================

    /**
     * Get detailed audit log with parsed field changes
     */
    public AuditLogDetailResponse getAuditLogDetail(Long auditLogId) {
        AuditLog auditLog = auditLogRepository.findById(auditLogId)
            .orElseThrow(() -> new ResourceNotFoundException("Audit log not found"));

        return buildDetailResponse(auditLog);
    }

    /**
     * Build detailed response with field-by-field comparison
     */
    private AuditLogDetailResponse buildDetailResponse(AuditLog auditLog) {
        List<AuditLogDetailResponse.FieldChange> fieldChanges =
            calculateFieldChanges(
                auditLog.getEntityType(),
                auditLog.getOldValue(),
                auditLog.getNewValue()
            );

        AuditLogDetailResponse.DeviceInfo deviceInfo =
            parseUserAgent(auditLog.getUserAgent());

        String entityLink = buildEntityLink(
            auditLog.getEntityType(),
            auditLog.getEntityId()
        );

        return AuditLogDetailResponse.builder()
            .id(auditLog.getId())
            .entityType(auditLog.getEntityType())
            .entityId(auditLog.getEntityId())
            .action(auditLog.getAction())
            .createdAt(auditLog.getCreatedAt())
            .username(auditLog.getUsername())
            .userId(auditLog.getUserId())
            .ipAddress(auditLog.getIpAddress())
            .deviceInfo(deviceInfo)
            .fieldChanges(fieldChanges)
            .oldValue(auditLog.getOldValue())
            .newValue(auditLog.getNewValue())
            .entityName(getEntityName(auditLog.getEntityType(), auditLog.getEntityId()))
            .entityLink(entityLink)
            .build();
    }

    /**
     * Calculate field changes with labels and formatting
     */
    private List<AuditLogDetailResponse.FieldChange> calculateFieldChanges(
            String entityType,
            Map<String, Object> oldValue,
            Map<String, Object> newValue) {

        List<AuditLogDetailResponse.FieldChange> changes = new ArrayList<>();
        Set<String> allFields = new HashSet<>();

        if (oldValue != null) allFields.addAll(oldValue.keySet());
        if (newValue != null) allFields.addAll(newValue.keySet());

        for (String fieldName : allFields) {
            Object oldVal = oldValue != null ? oldValue.get(fieldName) : null;
            Object newVal = newValue != null ? newValue.get(fieldName) : null;

            AuditLogDetailResponse.ChangeType changeType = determineChangeType(oldVal, newVal);

            // Skip unchanged fields
            if (changeType == AuditLogDetailResponse.ChangeType.UNCHANGED) {
                continue;
            }

            String fieldLabel = fieldLabelService.getFieldLabel(entityType, fieldName);
            AuditLogDetailResponse.FieldType fieldType =
                fieldLabelService.getFieldType(entityType, fieldName);
            boolean isSensitive = fieldLabelService.isSensitiveField(entityType, fieldName);

            // Format values
            String oldFormatted = formatValue(oldVal, fieldType, isSensitive);
            String newFormatted = formatValue(newVal, fieldType, isSensitive);

            AuditLogDetailResponse.FieldChange change =
                AuditLogDetailResponse.FieldChange.builder()
                    .fieldName(fieldName)
                    .fieldLabel(fieldLabel)
                    .oldValue(oldVal)
                    .newValue(newVal)
                    .changeType(changeType)
                    .fieldType(fieldType)
                    .isSensitive(isSensitive)
                    .oldValueFormatted(oldFormatted)
                    .newValueFormatted(newFormatted)
                    .build();

            changes.add(change);
        }

        return changes;
    }

    /**
     * Determine the type of change for a field
     */
    private AuditLogDetailResponse.ChangeType determineChangeType(Object oldVal, Object newVal) {
        if (oldVal == null && newVal != null) {
            return AuditLogDetailResponse.ChangeType.ADDED;
        }
        if (oldVal != null && newVal == null) {
            return AuditLogDetailResponse.ChangeType.REMOVED;
        }
        if (oldVal != null && !Objects.equals(oldVal, newVal)) {
            return AuditLogDetailResponse.ChangeType.MODIFIED;
        }
        return AuditLogDetailResponse.ChangeType.UNCHANGED;
    }

    /**
     * Format value based on field type
     */
    private String formatValue(Object value, AuditLogDetailResponse.FieldType fieldType, boolean isSensitive) {
        if (value == null) {
            return "-";
        }

        if (isSensitive) {
            return maskSensitiveValue(value.toString());
        }

        return switch (fieldType) {
            case CURRENCY -> formatCurrency(value);
            case DATE -> formatDate(value);
            case DATETIME -> formatDateTime(value);
            case BOOLEAN -> formatBoolean(value);
            case ENUM -> value.toString(); // Already in Uzbek from source
            default -> value.toString();
        };
    }

    /**
     * Mask sensitive data
     */
    private String maskSensitiveValue(String value) {
        if (value.length() <= 4) {
            return "******";
        }
        return "******" + value.substring(value.length() - 4);
    }

    /**
     * Format currency value
     */
    private String formatCurrency(Object value) {
        if (value instanceof Number) {
            BigDecimal amount = new BigDecimal(value.toString());
            return String.format("%,.2f so'm", amount);
        }
        return value.toString();
    }

    /**
     * Format date value
     */
    private String formatDate(Object value) {
        if (value == null) return "-";
        try {
            if (value instanceof String) {
                LocalDate date = LocalDate.parse(value.toString());
                return date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            }
            return value.toString();
        } catch (Exception e) {
            return value.toString();
        }
    }

    /**
     * Format datetime value
     */
    private String formatDateTime(Object value) {
        if (value == null) return "-";
        try {
            if (value instanceof String) {
                LocalDateTime dateTime = LocalDateTime.parse(value.toString());
                return dateTime.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"));
            }
            return value.toString();
        } catch (Exception e) {
            return value.toString();
        }
    }

    /**
     * Format boolean value to Uzbek
     */
    private String formatBoolean(Object value) {
        if (value instanceof Boolean) {
            return ((Boolean) value) ? "Ha" : "Yo'q";
        }
        return value.toString();
    }

    /**
     * Parse User-Agent into structured device info
     */
    private AuditLogDetailResponse.DeviceInfo parseUserAgent(String userAgent) {
        if (userAgent == null || userAgent.isEmpty()) {
            return AuditLogDetailResponse.DeviceInfo.builder()
                .deviceType("Noma'lum")
                .browser("Noma'lum")
                .os("Noma'lum")
                .userAgent("-")
                .build();
        }

        String deviceType = extractDeviceType(userAgent);
        String browser = extractBrowser(userAgent);
        String browserVersion = extractBrowserVersion(userAgent);
        String os = extractOS(userAgent);
        String osVersion = extractOSVersion(userAgent);

        return AuditLogDetailResponse.DeviceInfo.builder()
            .deviceType(deviceType)
            .browser(browser)
            .browserVersion(browserVersion)
            .os(os)
            .osVersion(osVersion)
            .userAgent(userAgent)
            .build();
    }

    /**
     * Extract device type from User-Agent
     */
    private String extractDeviceType(String userAgent) {
        if (userAgent == null) return "Noma'lum";

        userAgent = userAgent.toLowerCase();

        if (userAgent.contains("mobile") || userAgent.contains("android") && userAgent.contains("mobile")) {
            return "Mobile";
        }
        if (userAgent.contains("tablet") || userAgent.contains("ipad")) {
            return "Tablet";
        }
        return "Desktop";
    }

    /**
     * Extract browser from User-Agent
     */
    private String extractBrowser(String userAgent) {
        if (userAgent == null) return "Noma'lum";

        if (userAgent.contains("Edg/") || userAgent.contains("Edge/")) {
            return "Edge";
        }
        if (userAgent.contains("Chrome/") && !userAgent.contains("Edg")) {
            return "Chrome";
        }
        if (userAgent.contains("Firefox/")) {
            return "Firefox";
        }
        if (userAgent.contains("Safari/") && !userAgent.contains("Chrome")) {
            return "Safari";
        }
        if (userAgent.contains("Opera/") || userAgent.contains("OPR/")) {
            return "Opera";
        }
        return "Boshqa";
    }

    /**
     * Extract browser version from User-Agent
     */
    private String extractBrowserVersion(String userAgent) {
        if (userAgent == null) return null;

        try {
            if (userAgent.contains("Edg/")) {
                return extractVersion(userAgent, "Edg/");
            }
            if (userAgent.contains("Chrome/")) {
                return extractVersion(userAgent, "Chrome/");
            }
            if (userAgent.contains("Firefox/")) {
                return extractVersion(userAgent, "Firefox/");
            }
            if (userAgent.contains("Version/")) {
                return extractVersion(userAgent, "Version/");
            }
        } catch (Exception e) {
            log.debug("Failed to extract browser version: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Extract OS from User-Agent
     */
    private String extractOS(String userAgent) {
        if (userAgent == null) return "Noma'lum";

        if (userAgent.contains("Windows NT 10.0")) return "Windows 10/11";
        if (userAgent.contains("Windows NT 6.3")) return "Windows 8.1";
        if (userAgent.contains("Windows NT 6.2")) return "Windows 8";
        if (userAgent.contains("Windows NT 6.1")) return "Windows 7";
        if (userAgent.contains("Windows")) return "Windows";

        if (userAgent.contains("Mac OS X")) return "macOS";
        if (userAgent.contains("iPhone") || userAgent.contains("iPad")) return "iOS";
        if (userAgent.contains("Android")) return "Android";
        if (userAgent.contains("Linux")) return "Linux";

        return "Boshqa";
    }

    /**
     * Extract OS version from User-Agent
     */
    private String extractOSVersion(String userAgent) {
        if (userAgent == null) return null;

        try {
            if (userAgent.contains("Mac OS X")) {
                int startIdx = userAgent.indexOf("Mac OS X") + 9;
                int endIdx = userAgent.indexOf(")", startIdx);
                if (endIdx > startIdx) {
                    return userAgent.substring(startIdx, endIdx).trim().replace("_", ".");
                }
            }
            if (userAgent.contains("Android")) {
                int startIdx = userAgent.indexOf("Android") + 8;
                int endIdx = userAgent.indexOf(";", startIdx);
                if (endIdx > startIdx) {
                    return userAgent.substring(startIdx, endIdx).trim();
                }
            }
            if (userAgent.contains("iPhone OS") || userAgent.contains("CPU OS")) {
                int startIdx = userAgent.contains("iPhone OS") ?
                    userAgent.indexOf("iPhone OS") + 10 :
                    userAgent.indexOf("CPU OS") + 7;
                int endIdx = userAgent.indexOf(" like", startIdx);
                if (endIdx > startIdx) {
                    return userAgent.substring(startIdx, endIdx).trim().replace("_", ".");
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract OS version: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Helper method to extract version string
     */
    private String extractVersion(String userAgent, String prefix) {
        int startIdx = userAgent.indexOf(prefix) + prefix.length();
        int endIdx = userAgent.indexOf(" ", startIdx);
        if (endIdx == -1) {
            endIdx = userAgent.indexOf(")", startIdx);
        }
        if (endIdx == -1) {
            endIdx = userAgent.length();
        }
        return userAgent.substring(startIdx, endIdx);
    }

    /**
     * Build entity navigation link
     */
    private String buildEntityLink(String entityType, Long entityId) {
        if (entityType == null || entityId == null) {
            return null;
        }

        return switch (entityType) {
            case "Product" -> "/products/" + entityId;
            case "Customer" -> "/customers/" + entityId;
            case "Employee" -> "/employees/" + entityId;
            case "Supplier" -> "/suppliers/" + entityId;
            case "Sale" -> "/sales/" + entityId;
            case "PurchaseOrder" -> "/purchases/" + entityId;
            case "Brand" -> "/settings#brands";
            case "Category" -> "/settings#categories";
            default -> null;
        };
    }

    /**
     * Get friendly entity name (for future implementation)
     */
    private String getEntityName(String entityType, Long entityId) {
        // This can be extended to fetch actual entity names
        // For now, just return the type with ID
        return entityType + " #" + entityId;
    }
}
