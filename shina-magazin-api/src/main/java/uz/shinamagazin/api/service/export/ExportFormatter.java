package uz.shinamagazin.api.service.export;

import org.springframework.stereotype.Component;
import uz.shinamagazin.api.enums.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service for formatting export values based on column configuration.
 * Handles currency, dates, enums, booleans, and sensitive data masking.
 */
@Component
public class ExportFormatter {

    private static final DateTimeFormatter DATE_FORMATTER =
        DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER =
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    public Object format(Object value, ExportColumnConfig config) {
        if (value == null) return "-";

        // Sensitive data masking
        if (config.isSensitive()) {
            return maskSensitiveData(value.toString());
        }

        return switch (config.getType()) {
            case CURRENCY -> formatCurrency((BigDecimal) value);
            case DATE -> formatDate((LocalDate) value);
            case DATETIME -> formatDateTime((LocalDateTime) value);
            case ENUM -> formatEnum(value);
            case BOOLEAN -> formatBoolean((Boolean) value);
            case NUMBER -> value.toString();
            default -> value.toString();
        };
    }

    private String formatCurrency(BigDecimal value) {
        return String.format("%,.2f so'm", value);
    }

    private String formatDate(LocalDate value) {
        return value.format(DATE_FORMATTER);
    }

    private String formatDateTime(LocalDateTime value) {
        return value.format(DATETIME_FORMATTER);
    }

    private String formatEnum(Object value) {
        if (value instanceof Season season) {
            return switch (season) {
                case SUMMER -> "Yoz";
                case WINTER -> "Qish";
                case ALL_SEASON -> "Barcha fasl";
            };
        }
        if (value instanceof CustomerType customerType) {
            return switch (customerType) {
                case INDIVIDUAL -> "Jismoniy shaxs";
                case BUSINESS -> "Yuridik shaxs";
            };
        }
        if (value instanceof EmployeeStatus employeeStatus) {
            return switch (employeeStatus) {
                case ACTIVE -> "Faol";
                case ON_LEAVE -> "Ta'tilda";
                case TERMINATED -> "Ishdan bo'shatilgan";
            };
        }
        if (value instanceof PurchaseOrderStatus status) {
            return switch (status) {
                case DRAFT -> "Qoralama";
                case ORDERED -> "Buyurtma berilgan";
                case PARTIAL -> "Qisman qabul qilingan";
                case RECEIVED -> "To'liq qabul qilingan";
                case CANCELLED -> "Bekor qilingan";
            };
        }
        if (value instanceof PaymentStatus status) {
            return switch (status) {
                case PAID -> "To'liq to'langan";
                case PARTIAL -> "Qisman to'langan";
                case UNPAID -> "To'lanmagan";
            };
        }
        if (value instanceof PaymentMethod method) {
            return switch (method) {
                case CASH -> "Naqd";
                case CARD -> "Plastik karta";
                case TRANSFER -> "Bank o'tkazmasi";
                case MIXED -> "Aralash";
            };
        }
        if (value instanceof PaymentType type) {
            return switch (type) {
                case SALE_PAYMENT -> "Sotuv uchun to'lov";
                case DEBT_PAYMENT -> "Qarz uchun to'lov";
            };
        }
        if (value instanceof SaleStatus status) {
            return switch (status) {
                case COMPLETED -> "Yakunlangan";
                case CANCELLED -> "Bekor qilingan";
                case REFUNDED -> "Qaytarilgan";
            };
        }
        if (value instanceof DebtStatus status) {
            return switch (status) {
                case ACTIVE -> "Faol";
                case PAID -> "To'langan";
                case OVERDUE -> "Muddati o'tgan";
            };
        }
        if (value instanceof MovementType type) {
            return switch (type) {
                case IN -> "Kirim";
                case OUT -> "Chiqim";
                case ADJUSTMENT -> "Tuzatish";
            };
        }
        if (value instanceof PurchaseReturnStatus status) {
            return switch (status) {
                case PENDING -> "Kutilmoqda";
                case APPROVED -> "Tasdiqlangan";
                case COMPLETED -> "Yakunlangan";
                case REJECTED -> "Rad etilgan";
            };
        }
        // Default fallback for unknown enums
        return value.toString();
    }

    private String formatBoolean(Boolean value) {
        return value ? "Ha" : "Yo'q";
    }

    private String maskSensitiveData(String value) {
        if (value.length() <= 4) return "****";
        return "*".repeat(value.length() - 4) + value.substring(value.length() - 4);
    }
}
