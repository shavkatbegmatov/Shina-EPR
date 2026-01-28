package uz.shinamagazin.api.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.service.PermissionService;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * AOP Aspect for checking permissions on methods annotated with @RequiresPermission
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionAspect {

    private final PermissionService permissionService;

    @Before("@annotation(uz.shinamagazin.api.security.RequiresPermission)")
    public void checkPermission(JoinPoint joinPoint) {
        // Get current authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Autentifikatsiya talab qilinadi");
        }

        // Get current user details
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof CustomUserDetails)) {
            throw new AccessDeniedException("Noto'g'ri foydalanuvchi konteksti");
        }

        CustomUserDetails userDetails = (CustomUserDetails) principal;
        Long userId = userDetails.getId();

        // Get annotation from method
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

        if (annotation == null) {
            // Check class-level annotation
            annotation = joinPoint.getTarget().getClass().getAnnotation(RequiresPermission.class);
        }

        if (annotation == null) {
            return; // No annotation, allow access
        }

        // Get required permissions
        PermissionCode[] requiredPermissions = annotation.value();
        boolean requireAll = annotation.requireAll();
        String errorMessage = annotation.message();

        // Check permissions
        boolean hasPermission;
        if (requireAll) {
            hasPermission = permissionService.hasAllPermissions(userId, requiredPermissions);
        } else {
            hasPermission = permissionService.hasAnyPermission(userId, requiredPermissions);
        }

        if (!hasPermission) {
            String permissionNames = Arrays.stream(requiredPermissions)
                    .map(PermissionCode::getCode)
                    .collect(Collectors.joining(", "));

            log.warn("Permission denied for user {} on method {}. Required: {} (requireAll={})",
                    userDetails.getUsername(),
                    method.getName(),
                    permissionNames,
                    requireAll);

            throw new AccessDeniedException(errorMessage + " (" + permissionNames + ")");
        }

        log.debug("Permission granted for user {} on method {}",
                userDetails.getUsername(),
                method.getName());
    }
}
