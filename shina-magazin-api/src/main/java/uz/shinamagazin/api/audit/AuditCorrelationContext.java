package uz.shinamagazin.api.audit;

import java.util.UUID;

/**
 * ThreadLocal context for audit log correlation.
 * Used to group multiple audit logs that are created as part of a single request/operation.
 *
 * <p>Example usage:</p>
 * <pre>
 * // At request start
 * AuditCorrelationContext.start();
 *
 * // During entity operations (automatically used by AuditEntityListener)
 * UUID correlationId = AuditCorrelationContext.get();
 *
 * // At request end
 * AuditCorrelationContext.clear();
 * </pre>
 */
public final class AuditCorrelationContext {

    private static final ThreadLocal<UUID> CORRELATION_ID = new ThreadLocal<>();

    private AuditCorrelationContext() {
        // Utility class - prevent instantiation
    }

    /**
     * Start a new correlation context by generating a new UUID.
     * Call this at the beginning of a request/operation.
     *
     * @return the generated correlation ID
     */
    public static UUID start() {
        UUID correlationId = UUID.randomUUID();
        CORRELATION_ID.set(correlationId);
        return correlationId;
    }

    /**
     * Get the current correlation ID.
     *
     * @return the current correlation ID, or null if not set
     */
    public static UUID get() {
        return CORRELATION_ID.get();
    }

    /**
     * Clear the correlation context.
     * Call this at the end of a request/operation to prevent memory leaks.
     */
    public static void clear() {
        CORRELATION_ID.remove();
    }

    /**
     * Check if a correlation context is currently active.
     *
     * @return true if a correlation ID is set
     */
    public static boolean isActive() {
        return CORRELATION_ID.get() != null;
    }
}
