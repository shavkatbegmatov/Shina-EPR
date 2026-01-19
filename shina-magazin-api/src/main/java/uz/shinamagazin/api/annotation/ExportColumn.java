package uz.shinamagazin.api.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for configuring export columns in DTO classes.
 *
 * Usage:
 * <pre>
 * {@code
 * @ExportColumn(header = "Mahsulot nomi", order = 1, type = ColumnType.STRING)
 * private String name;
 *
 * @ExportColumn(header = "Narx", order = 2, type = ColumnType.CURRENCY)
 * private BigDecimal price;
 * }
 * </pre>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ExportColumn {
    /**
     * Display header in export
     * Example: "Mahsulot nomi", "Xarid narxi"
     */
    String header();

    /**
     * Column order (lower = leftmost)
     */
    int order() default 999;

    /**
     * Column type for formatting
     */
    ColumnType type() default ColumnType.STRING;

    /**
     * Format string for dates/numbers
     * Examples: "dd.MM.yyyy", "#,##0.00"
     */
    String format() default "";

    /**
     * Mask sensitive data (passport, bank account, etc.)
     */
    boolean sensitive() default false;

    /**
     * For nested objects - specify field to extract
     * Example: "name" for brand.name
     */
    String nestedField() default "";

    enum ColumnType {
        STRING,
        NUMBER,
        CURRENCY,
        DATE,
        DATETIME,
        BOOLEAN,
        ENUM
    }
}
