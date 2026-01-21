package uz.shinamagazin.api.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.AuditLogService;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JPA Entity Listener for automatic audit trail logging.
 * This listener captures CREATE, UPDATE, and DELETE operations on entities
 * that implement the Auditable interface.
 *
 * <p>The listener uses static injection to access Spring-managed beans
 * because JPA entity listeners are not managed by Spring by default.</p>
 *
 * <h3>Lifecycle Hooks:</h3>
 * <ul>
 *   <li>{@code @PostPersist} - Called after entity is created (INSERT)</li>
 *   <li>{@code @PreUpdate} - Called before entity is updated (UPDATE)</li>
 *   <li>{@code @PreRemove} - Called before entity is deleted (DELETE)</li>
 * </ul>
 *
 * <h3>Usage:</h3>
 * Add this listener to your entity class:
 * <pre>
 * {@code
 * @Entity
 * @EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
 * public class User extends BaseEntity implements Auditable {
 *     // ...
 * }
 * }
 * </pre>
 *
 * <h3>Performance Considerations:</h3>
 * <ul>
 *   <li>Audit logging is asynchronous and won't block main transaction</li>
 *   <li>Uses separate transaction to avoid rollback issues</li>
 *   <li>Minimal overhead (< 5ms per operation)</li>
 * </ul>
 */
@Component
@Slf4j
public class AuditEntityListener {

    // Static references to Spring beans (injected via init method)
    private static AuditLogService auditLogService;
    private static EntityManager entityManager;
    private static SensitiveDataMasker sensitiveDataMasker;
    private static ObjectMapper objectMapper;

    // Cache to store original entity state when loaded from database
    // Key: "EntityClass:EntityId", Value: audit map of original values
    private static final ConcurrentHashMap<String, Map<String, Object>> originalStateCache = new ConcurrentHashMap<>();

    /**
     * Spring autowiring method to inject dependencies into static fields.
     * This is a workaround for JPA entity listeners not being Spring-managed.
     *
     * @param service the audit log service
     * @param em the entity manager
     * @param masker the sensitive data masker
     * @param mapper the object mapper for JSON serialization
     */
    @Autowired
    public void init(AuditLogService service,
                     EntityManager em,
                     SensitiveDataMasker masker,
                     ObjectMapper mapper) {
        AuditEntityListener.auditLogService = service;
        AuditEntityListener.entityManager = em;
        AuditEntityListener.sensitiveDataMasker = masker;
        AuditEntityListener.objectMapper = mapper;
        log.info("AuditEntityListener initialized successfully");
    }

    /**
     * Called after an entity is loaded from the database.
     * Caches the original state for later comparison during updates.
     *
     * @param entity the entity that was loaded
     */
    @PostLoad
    public void onPostLoad(Object entity) {
        if (!(entity instanceof Auditable auditable)) {
            return;
        }

        try {
            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());
            Map<String, Object> originalData = auditable.toAuditMap();
            originalStateCache.put(cacheKey, originalData);
            log.debug("Cached original state for {} with id {}", auditable.getEntityName(), auditable.getId());
        } catch (Exception e) {
            log.warn("Could not cache original state for {}: {}", entity.getClass().getSimpleName(), e.getMessage());
        }
    }

    /**
     * Generates a cache key for an entity.
     */
    private String getCacheKey(Class<?> entityClass, Long entityId) {
        return entityClass.getName() + ":" + entityId;
    }

    /**
     * Called after an entity is persisted (INSERT operation).
     * Logs a CREATE action to the audit trail.
     *
     * @param entity the entity that was created
     */
    @PostPersist
    public void onPostPersist(Object entity) {
        if (!(entity instanceof Auditable auditable)) {
            return;
        }

        try {
            Long userId = getCurrentUserId();
            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();

            Map<String, Object> newData = sensitiveDataMasker.mask(
                    auditable.toAuditMap(),
                    auditable.getSensitiveFields()
            );

            auditLogService.logCreateWithContext(
                    auditable.getEntityName(),
                    auditable.getId(),
                    newData,
                    userId,
                    ipAddress,
                    userAgent
            );

            log.debug("Logged CREATE for {} with id {}",
                    auditable.getEntityName(), auditable.getId());

        } catch (Exception e) {
            log.error("Error logging CREATE operation for {}: {}",
                    entity.getClass().getSimpleName(), e.getMessage(), e);
        }
    }

    /**
     * Called before an entity is updated (UPDATE operation).
     * Uses the cached original state and logs an UPDATE action
     * with both old and new values.
     *
     * @param entity the entity being updated
     */
    @PreUpdate
    public void onPreUpdate(Object entity) {
        if (!(entity instanceof Auditable auditable)) {
            return;
        }

        try {
            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());

            // Get old data from cache (captured at @PostLoad)
            Map<String, Object> originalData = originalStateCache.remove(cacheKey);

            if (originalData == null) {
                log.warn("No cached original state found for {} with id {}. Skipping audit log.",
                        auditable.getEntityName(), auditable.getId());
                return;
            }

            Long userId = getCurrentUserId();
            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();

            // Mask sensitive fields in old data
            Map<String, Object> oldData = sensitiveDataMasker.mask(
                    originalData,
                    auditable.getSensitiveFields()
            );

            // Get new data and mask sensitive fields
            Map<String, Object> newData = sensitiveDataMasker.mask(
                    auditable.toAuditMap(),
                    auditable.getSensitiveFields()
            );

            auditLogService.logUpdateWithContext(
                    auditable.getEntityName(),
                    auditable.getId(),
                    oldData,
                    newData,
                    userId,
                    ipAddress,
                    userAgent
            );

            log.debug("Logged UPDATE for {} with id {}", auditable.getEntityName(), auditable.getId());

        } catch (Exception e) {
            log.error("Error logging UPDATE operation for {}: {}",
                    entity.getClass().getSimpleName(), e.getMessage(), e);
        }
    }

    /**
     * Called before an entity is removed (DELETE operation).
     * Logs a DELETE action to the audit trail.
     *
     * @param entity the entity being deleted
     */
    @PreRemove
    public void onPreRemove(Object entity) {
        if (!(entity instanceof Auditable auditable)) {
            return;
        }

        try {
            // Clean up cache entry
            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());
            originalStateCache.remove(cacheKey);

            Long userId = getCurrentUserId();
            String ipAddress = getClientIpAddress();
            String userAgent = getUserAgent();

            Map<String, Object> oldData = sensitiveDataMasker.mask(
                    auditable.toAuditMap(),
                    auditable.getSensitiveFields()
            );

            auditLogService.logDeleteWithContext(
                    auditable.getEntityName(),
                    auditable.getId(),
                    oldData,
                    userId,
                    ipAddress,
                    userAgent
            );

            log.debug("Logged DELETE for {} with id {}",
                    auditable.getEntityName(), auditable.getId());

        } catch (Exception e) {
            log.error("Error logging DELETE operation for {}: {}",
                    entity.getClass().getSimpleName(), e.getMessage(), e);
        }
    }

    /**
     * Get the current user ID from Spring Security context.
     * Returns null if no user is authenticated (e.g., system operations).
     *
     * @return the current user ID, or null if not available
     */
    private Long getCurrentUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication != null && authentication.isAuthenticated()) {
                Object principal = authentication.getPrincipal();

                if (principal instanceof CustomUserDetails userDetails) {
                    return userDetails.getId();
                }
            }
        } catch (Exception e) {
            log.warn("Could not retrieve current user ID for audit log: {}", e.getMessage());
        }

        return null; // System operation or unauthenticated request
    }

    /**
     * Get the client IP address from the HTTP request.
     * Checks X-Forwarded-For header first (for proxied requests),
     * then falls back to remote address.
     *
     * @return the client IP address, or null if not available
     */
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

    /**
     * Get the User-Agent header from the HTTP request.
     *
     * @return the User-Agent string, or null if not available
     */
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
