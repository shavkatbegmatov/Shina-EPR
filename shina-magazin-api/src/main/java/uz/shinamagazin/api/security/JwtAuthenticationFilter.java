package uz.shinamagazin.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import uz.shinamagazin.api.service.SessionService;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService staffUserDetailsService;
    private final CustomerUserDetailsService customerUserDetailsService;
    private final SessionService sessionService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // WebSocket endpoint'larni filtrlashdan o'tkazib yuborish
        return pathWithinApp(request).startsWith("/v1/ws");
    }

    /**
     * Context-path'siz yo'l ({@code /v1/...}).
     *
     * <p>{@code getRequestURI()} context-path'ni ham qaytaradi: prod'da
     * {@code server.servlet.context-path=/api} bo'lgani uchun u {@code /api/v1/auth/change-password}
     * bo'ladi. Ilgari shu qiymat {@code /v1/auth/change-password} bilan solishtirilardi va hech
     * qachon mos kelmasdi — vaqtinchalik parol olgan xodim parolni almashtirish endpointidan ham
     * 403 olib, tizimdan butunlay qulflanib qolardi. Testlar buni ko'rmasdi, chunki
     * {@code MockHttpServletRequest} da context-path bo'sh.
     */
    static String pathWithinApp(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return "";
        }
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            return uri.substring(contextPath.length());
        }
        return uri;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // Refresh token faqat /refresh-token uchun — API kirishga
                // yaramaydi. Ayniqsa mijoz refresh tokenlari muhim: ular
                // sessiya tekshiruvidan o'tmaydi va busiz 7 kunlik access
                // token vazifasini bajarib yurardi.
                if (tokenProvider.isRefreshToken(jwt)) {
                    log.warn("Refresh token API so'roviga access token sifatida yuborildi — rad etildi");
                    filterChain.doFilter(request, response);
                    return;
                }

                // Check if session is still active in database (only for staff tokens)
                boolean isCustomerToken = tokenProvider.isCustomerToken(jwt);
                if (!isCustomerToken && !sessionService.isSessionValid(jwt)) {
                    log.warn("JWT is valid but session has been revoked");
                    filterChain.doFilter(request, response);
                    return;
                }

                String username = tokenProvider.getUsernameFromToken(jwt);

                UserDetails userDetails;
                if (isCustomerToken) {
                    // Mijoz tokeni - phone orqali yuklash
                    userDetails = customerUserDetailsService.loadUserByUsername(username);
                } else {
                    // Staff tokeni - username orqali yuklash
                    userDetails = staffUserDetailsService.loadUserByUsername(username);
                }

                // Token va sessiya tirik bo'lsa ham hisob o'chirilgan bo'lishi
                // mumkin (deaktivatsiyadan oldin olingan token). isEnabled:
                // xodimda user.active, mijozda customer.active && portalEnabled.
                // DaoAuthenticationProvider buni faqat login'da tekshiradi —
                // shu yerda tekshirilmasa, deaktivatsiya token muddati
                // tugagunga qadar kuchga kirmasdi.
                if (!userDetails.isEnabled()) {
                    log.warn("JWT is valid but account is disabled: {}", username);
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Vaqtinchalik parol Telegram xabarida yetkaziladi va uning
                // xavfsizligi "birinchi kirishda majburan almashtiriladi"
                // degan va'daga tayanadi. Ilgari bu va'da hech qayerda
                // bajarilmasdi: modal oddiygina yopilardi, server esa
                // `mustChangePassword` ni umuman tekshirmasdi — Telegram
                // tarixidagi parol muddatsiz amal qilardi.
                if (!isCustomerToken && userDetails instanceof CustomUserDetails staff
                        && Boolean.TRUE.equals(staff.getUser().getMustChangePassword())
                        && !isAllowedWhilePasswordChangePending(request)) {
                    log.warn("Parol almashtirilmagunga qadar kirish cheklangan: {}", username);
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write(
                            "{\"success\":false,\"message\":\"Avval parolni almashtiring\"}");
                    return;
                }

                // Update last activity for staff sessions (5 daqiqada bir DB'ga yoziladi)
                if (!isCustomerToken) {
                    try {
                        sessionService.touchActivity(jwt);
                    } catch (Exception e) {
                        log.warn("Failed to update session activity", e);
                    }
                }
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Parol almashtirish kutilayotganda ruxsat etilgan yo'llar — foydalanuvchi
     * o'zini tanishtira olishi, parolni almashtira olishi va chiqa olishi kerak.
     */
    private boolean isAllowedWhilePasswordChangePending(HttpServletRequest request) {
        String path = pathWithinApp(request);
        return path.equals("/v1/auth/change-password")
                || path.equals("/v1/auth/me")
                || path.equals("/v1/auth/logout")
                || path.startsWith("/v1/auth/refresh-token");
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
