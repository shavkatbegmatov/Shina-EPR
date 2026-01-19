package uz.shinamagazin.api.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for configuring entity-level export settings.
 *
 * Usage:
 * <pre>
 * {@code
 * @ExportEntity(
 *     sheetName = "Mahsulotlar",
 *     title = "Mahsulotlar Hisoboti",
 *     orientation = Orientation.LANDSCAPE
 * )
 * public class ProductResponse {
 *     // fields with @ExportColumn annotations
 * }
 * }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ExportEntity {
    /**
     * Excel sheet name
     */
    String sheetName() default "";

    /**
     * Report title (shown in Excel/PDF)
     */
    String title() default "";

    /**
     * PDF orientation
     */
    Orientation orientation() default Orientation.PORTRAIT;

    enum Orientation {
        PORTRAIT,
        LANDSCAPE
    }
}
