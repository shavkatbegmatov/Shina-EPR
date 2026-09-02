package uz.shinamagazin.api.audit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.UUID;

/**
 * HTTP request interceptor that manages audit correlation context.
 * Starts a new correlation context for mutating requests (POST, PUT, PATCH, DELETE)
 * and clears it after the request is completed.
 *
 * <p>Shu bilan birga so'rov ID'sini log MDC'siga ({@code cid}) yozadi: mutatsiyalarda
 * bu audit correlation UUID'ning o'zi (audit_logs.correlation_id bilan bir xil —
 * jurnaldagi yozuvni ilova logidagi qatorlar bilan bog'lash mumkin), o'qishlarda
 * qisqa tasodifiy ID. Ilgari MDC umuman ishlatilmasdi va bitta so'rovning log
 * qatorlarini bir-biriga bog'lab bo'lmasdi. Qarang: logback-spring.xml, AsyncConfig.
 */
@Component
@Slf4j
public class AuditCorrelationInterceptor implements HandlerInterceptor {

    /** MDC kaliti — logback-spring.xml pattern'ida {@code %X{cid}}. */
    public static final String MDC_KEY = "cid";

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String method = request.getMethod();

        // Only start correlation for mutating requests
        if (MUTATING_METHODS.contains(method)) {
            UUID correlationId = AuditCorrelationContext.start();
            MDC.put(MDC_KEY, correlationId.toString().substring(0, 8));
            log.debug("Started audit correlation context: {} for {} {}",
                    correlationId, method, request.getRequestURI());
        } else {
            MDC.put(MDC_KEY, UUID.randomUUID().toString().substring(0, 8));
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

        // Dastlabki-holat konteksti odatda tranzaksiya tugashida bo'shatiladi, lekin
        // tranzaksiyasiz o'qishlar (open-in-view ostidagi lazy yuklashlar) uchun
        // hech kim tozalamaydi. Oqim pool'ga qaytishidan oldin kafolatli bo'shatamiz.
        int leftover = AuditStateContext.size();
        if (leftover > 0) {
            AuditStateContext.clear();
            log.debug("Cleared {} leftover audit state entries for {} {}",
                    leftover, request.getMethod(), request.getRequestURI());
        }

        // Oqim pool'ga qaytadi — MDC keyingi so'rovga sizib o'tmasin
        MDC.remove(MDC_KEY);
    }
}
