package uz.shinamagazin.api.audit;

import java.util.Map;
import java.util.Set;

/**
 * Interface for entities that support automatic audit trail logging.
 * Entities implementing this interface will have their CREATE, UPDATE, and DELETE
 * operations automatically logged to the audit_logs table.
 *
 * Usage:
 * 1. Implement this interface in your entity
 * 2. Add @EntityListeners({AuditingEntityListener.class, AuditEntityListener.class}) to the entity class
 * 3. Implement the three required methods
 *
 * Example:
 * <pre>
 * {@code
 * @Entity
 * @EntityListeners({AuditingEntityListener.class, AuditEntityListener.class})
 * public class User extends BaseEntity implements Auditable {
 *     // ... fields ...
 *
 *     @Override
 *     public String getEntityName() {
 *         return "User";
 *     }
 *
 *     @Override
 *     public Map<String, Object> toAuditMap() {
 *         Map<String, Object> map = new HashMap<>();
 *         map.put("id", this.id);
 *         map.put("username", this.username);
 *         map.put("password", this.password); // Will be masked
 *         return map;
 *     }
 *
 *     @Override
 *     public Set<String> getSensitiveFields() {
 *         return Set.of("password");
 *     }
 * }
 * }
 * </pre>
 */
public interface Auditable {

    /**
     * Get the primary key ID of the entity.
     * This is used to link audit logs to specific entity instances.
     *
     * @return the entity ID
     */
    Long getId();

    /**
     * Get the name of the entity type for audit logging.
     * This should match the entity class name or a human-readable identifier.
     *
     * @return the entity name (e.g., "User", "Product", "Sale")
     */
    String getEntityName();

    /**
     * Convert the entity to a Map representation for audit logging.
     * This map will be serialized to JSON and stored in the audit_logs table.
     *
     * Important notes:
     * - Include all fields that should be tracked
     * - Include sensitive fields (they will be masked automatically)
     * - Avoid including lazy-loaded collections (causes N+1 queries)
     * - Use primitive types or simple objects that serialize well to JSON
     *
     * @return a map of field names to their values
     */
    Map<String, Object> toAuditMap();

    /**
     * Get the names of sensitive fields that should be masked in audit logs.
     * These fields will be replaced with "***MASKED***" before being saved.
     *
     * Common sensitive fields:
     * - password
     * - pinHash
     * - bankAccountNumber
     * - cardNumber
     * - ssn
     *
     * @return a set of field names to mask
     */
    Set<String> getSensitiveFields();
}
