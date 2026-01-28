package uz.shinamagazin.api.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Component responsible for masking sensitive data in audit logs.
 * This prevents passwords, PINs, bank account numbers, and other sensitive
 * information from being stored in plaintext in the audit_logs table.
 *
 * Usage:
 * <pre>
 * {@code
 * Map<String, Object> data = entity.toAuditMap();
 * Set<String> sensitiveFields = entity.getSensitiveFields();
 * Map<String, Object> maskedData = masker.mask(data, sensitiveFields);
 * }
 * </pre>
 */
@Component
@Slf4j
public class SensitiveDataMasker {

    /**
     * The value used to replace sensitive data in audit logs.
     */
    private static final String MASK = "***MASKED***";

    /**
     * Mask sensitive fields in the provided data map.
     * Creates a new map with sensitive values replaced by MASK constant.
     *
     * @param data the original data map
     * @param sensitiveFields the names of fields to mask
     * @return a new map with sensitive fields masked
     */
    public Map<String, Object> mask(Map<String, Object> data, Set<String> sensitiveFields) {
        if (data == null) {
            return null;
        }

        if (sensitiveFields == null || sensitiveFields.isEmpty()) {
            return data;
        }

        // Create a new map to avoid modifying the original
        Map<String, Object> maskedData = new HashMap<>(data);

        for (String field : sensitiveFields) {
            if (maskedData.containsKey(field)) {
                Object originalValue = maskedData.get(field);
                maskedData.put(field, MASK);

                log.trace("Masked sensitive field '{}' in audit log (original value was {})",
                        field, originalValue != null ? "present" : "null");
            }
        }

        return maskedData;
    }

    /**
     * Check if a specific field should be masked.
     *
     * @param fieldName the name of the field to check
     * @param sensitiveFields the set of sensitive field names
     * @return true if the field should be masked, false otherwise
     */
    public boolean isSensitive(String fieldName, Set<String> sensitiveFields) {
        return sensitiveFields != null && sensitiveFields.contains(fieldName);
    }

    /**
     * Get the mask value used for sensitive data.
     *
     * @return the mask constant
     */
    public String getMaskValue() {
        return MASK;
    }
}
