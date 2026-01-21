package uz.shinamagazin.api.audit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.UUID;

/**
 * HTTP request interceptor that manages audit correlation context.
 * Starts a new correlation context for mutating requests (POST, PUT, PATCH, DELETE)
 * and clears it after the request is completed.
 */
@Component
@Slf4j
public class AuditCorrelationInterceptor implements HandlerInterceptor {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();

        // Only start correlation for mutating requests
        if (MUTATING_METHODS.contains(method)) {
            UUID correlationId = AuditCorrelationContext.start();
            log.debug("Started audit correlation context: {} for {} {}",
                    correlationId, method, request.getRequestURI());
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                 Object handler, Exception ex) {
        // Always clear context to prevent memory leaks
        if (AuditCorrelationContext.isActive()) {
            UUID correlationId = AuditCorrelationContext.get();
            AuditCorrelationContext.clear();
            log.debug("Cleared audit correlation context: {} for {} {}",
                    correlationId, request.getMethod(), request.getRequestURI());
        }
    }
}
