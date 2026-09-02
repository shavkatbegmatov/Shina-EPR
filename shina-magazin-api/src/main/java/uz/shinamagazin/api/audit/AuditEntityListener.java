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
 *   <li>Audit yozuvi SINXRON — JPA callback'i ichida, asosiy tranzaksiya oqimida
 *       bajariladi. (Ilgari bu yerda "asinxron va tranzaksiyani bloklamaydi"
 *       deb yozilgan edi; kod hech qachon unday ishlamagan.)</li>
 *   <li>Dastlabki holat {@link AuditStateContext}da — tranzaksiya doirasida,
 *       tranzaksiya tugagach avtomatik bo'shatiladi.</li>
 *   <li>Ba'zi {@code toAuditMap()} implementatsiyalari lazy kolleksiyalarga
 *       tegadi (masalan PurchaseOrder: items/payments/returns), ya'ni har
 *       {@code @PostLoad}da qo'shimcha so'rov bo'ladi — bu alohida optimallashtirish
 *       mavzusi.</li>
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

    // Dastlabki holat AuditStateContext'da (ThreadLocal, tranzaksiya doirasida).
    // Ilgari shu yerda static ConcurrentHashMap turardi — u hech qachon
    // bo'shatilmasdi va oqimlar orasida poygaga sabab bo'lardi (izohni
    // AuditStateContext javadoc'ida ko'ring).

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
            // Force initialize lazy collections for User entity (for role audit)
            if (entity instanceof uz.shinamagazin.api.entity.User user) {
                org.hibernate.Hibernate.initialize(user.getRoles());
            }

            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());
            Map<String, Object> originalData = auditable.toAuditMap();
            AuditStateContext.put(cacheKey, originalData);
            log.debug("Cached original state for {} with id {}", auditable.getEntityName(), auditable.getId());
        } catch (Exception e) {
            log.warn("Could not cache original state for {}: {}", entity.getClass().getSimpleName(), e.getMessage());
        }
    }

    /**
     * Statik bog'liqliklar ulanganmi. JPA listener Spring bean emas — ular {@code @Autowired}
     * metod orqali keyinroq beriladi. {@code @DataJpaTest} kabi slice'larda umuman berilmaydi;
     * ilgari bu har bir yozuvda NPE va ERROR log bilan tugardi (audit baribir yozilmasdi).
     */
    private static boolean isWired() {
        return auditLogService != null && sensitiveDataMasker != null;
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
        if (!isWired()) {
            log.debug("Audit listener hali ulanmagan — CREATE {} o'tkazib yuborildi", auditable.getEntityName());
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
                    userAgent,
                    AuditCorrelationContext.get()
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
        if (!isWired()) {
            log.debug("Audit listener hali ulanmagan — UPDATE {} o'tkazib yuborildi", auditable.getEntityName());
            return;
        }

        try {
            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());

            // Get old data from context (captured at @PostLoad).
            // remove() EMAS: bitta tranzaksiyada ikkinchi yangilash baseline'siz
            // qolib, audit yozuvi jimgina tushmay qolmasligi uchun.
            Map<String, Object> originalData = AuditStateContext.get(cacheKey);

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
                    userAgent,
                    AuditCorrelationContext.get()
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
        if (!isWired()) {
            log.debug("Audit listener hali ulanmagan — DELETE {} o'tkazib yuborildi", auditable.getEntityName());
            return;
        }

        try {
            // Entity o'chirilmoqda — baseline endi keraksiz
            String cacheKey = getCacheKey(entity.getClass(), auditable.getId());
            AuditStateContext.remove(cacheKey);

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
                    userAgent,
                    AuditCorrelationContext.get()
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
