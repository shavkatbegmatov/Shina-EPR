package uz.shinamagazin.api.security;

import uz.shinamagazin.api.enums.PermissionCode;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for method-level permission checking.
 * Methods annotated with this will be checked for the required permission(s)
 * before execution.
 *
 * Usage:
 * <pre>
 * {@literal @}RequiresPermission(PermissionCode.PRODUCTS_VIEW)
 * public ResponseEntity<?> getProducts() { ... }
 *
 * {@literal @}RequiresPermission(value = {PermissionCode.PRODUCTS_VIEW, PermissionCode.PRODUCTS_CREATE}, requireAll = false)
 * public ResponseEntity<?> viewOrCreate() { ... }
 * </pre>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {

    /**
     * The permission(s) required to access this method.
     */
    PermissionCode[] value();

    /**
     * If true, user must have ALL specified permissions.
     * If false, user needs at least ONE of the specified permissions.
     * Default is false (any permission is sufficient).
     */
    boolean requireAll() default false;

    /**
     * Custom error message to display when permission is denied.
     */
    String message() default "Bu amalni bajarish uchun ruxsat yo'q";
}
