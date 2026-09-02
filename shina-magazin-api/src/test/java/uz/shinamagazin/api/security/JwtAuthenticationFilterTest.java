package uz.shinamagazin.api.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.service.SessionService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Filtr o'chirilgan hisobni o'tkazmasligi.
 *
 * <p>{@code DaoAuthenticationProvider} active flagni faqat LOGIN paytida
 * tekshiradi. Filtr tekshirmasa, deaktivatsiyadan oldin olingan token
 * muddati tugagunga qadar ishlayverardi — bo'shatilgan xodim 24 soatgacha
 * to'liq kirish bilan qolardi.
 */
class JwtAuthenticationFilterTest {

    private JwtTokenProvider tokenProvider;
    private CustomUserDetailsService staffService;
    private CustomerUserDetailsService customerService;
    private SessionService sessionService;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        tokenProvider = mock(JwtTokenProvider.class);
        staffService = mock(CustomUserDetailsService.class);
        customerService = mock(CustomerUserDetailsService.class);
        sessionService = mock(SessionService.class);
        filter = new JwtAuthenticationFilter(tokenProvider, staffService, customerService, sessionService);

        when(tokenProvider.validateToken(anyString())).thenReturn(true);
        when(tokenProvider.isCustomerToken(anyString())).thenReturn(false);
        when(tokenProvider.getUsernameFromToken(anyString())).thenReturn("kassir");
        when(sessionService.isSessionValid(anyString())).thenReturn(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void runFilter() throws Exception {
        runFilter("/v1/sales");
    }

    /**
     * So'rov prod'dagi kabi context-path ({@code /api}) bilan quriladi: {@code getRequestURI()}
     * {@code /api/v1/...} qaytaradi. Ilgari test bo'sh context-path bilan yurardi va filtrdagi
     * {@code /v1/...} taqqoslash xatosini ko'rmasdi.
     */
    private MockHttpServletResponse runFilter(String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/api");
        request.setRequestURI("/api" + path);
        request.addHeader("Authorization", "Bearer token-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    private static User staff(boolean active) {
        return User.builder()
                .username("kassir")
                .password("{noop}x")
                .fullName("Kassir Kassirov")
                .role(Role.SELLER)
                .active(active)
                .build();
    }

    @Test
    @DisplayName("Deaktivatsiya qilingan xodimning tirik tokeni autentifikatsiya bermaydi")
    void disabledStaffIsNotAuthenticated() throws Exception {
        when(staffService.loadUserByUsername("kassir"))
                .thenReturn(new CustomUserDetails(staff(false)));

        runFilter();

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("sessiya tirik bo'lsa ham hisob o'chirilgan — kirish yo'q")
                .isNull();
    }

    @Test
    @DisplayName("Faol xodim avvalgidek autentifikatsiya qilinadi")
    void activeStaffIsAuthenticated() throws Exception {
        when(staffService.loadUserByUsername("kassir"))
                .thenReturn(new CustomUserDetails(staff(true)));

        runFilter();

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    // Vaqtinchalik parol Telegram xabarida yetkaziladi va "birinchi kirishda
    // majburan almashtiriladi" degan va'daga tayanadi — ilgari bu va'da
    // hech qayerda bajarilmasdi.
    @Test
    @DisplayName("mustChangePassword tirik ekan oddiy endpointlar 403 qaytaradi")
    void pendingPasswordChangeBlocksRegularEndpoints() throws Exception {
        User staff = staff(true);
        staff.setMustChangePassword(true);
        when(staffService.loadUserByUsername("kassir")).thenReturn(new CustomUserDetails(staff));

        MockHttpServletResponse response = runFilter("/v1/sales");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Parolni almashtirish va chiqish yo'llari ochiq qoladi")
    void passwordChangeAndLogoutStayReachable() throws Exception {
        User staff = staff(true);
        staff.setMustChangePassword(true);
        when(staffService.loadUserByUsername("kassir")).thenReturn(new CustomUserDetails(staff));

        assertThat(runFilter("/v1/auth/change-password").getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("parolni almashtirish uchun autentifikatsiya kerak")
                .isNotNull();

        SecurityContextHolder.clearContext();
        assertThat(runFilter("/v1/auth/logout").getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Context-path'siz so'rovda ham (dev/test) ruxsat etilgan yo'llar ishlaydi")
    void passwordChangeReachableWithoutContextPath() throws Exception {
        User staff = staff(true);
        staff.setMustChangePassword(true);
        when(staffService.loadUserByUsername("kassir")).thenReturn(new CustomUserDetails(staff));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/v1/auth/change-password");
        request.addHeader("Authorization", "Bearer token-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    @DisplayName("WebSocket handshake yo'li context-path bilan ham filtrdan o'tkazib yuboriladi")
    void webSocketPathSkipsFilterWithContextPath() throws Exception {
        when(staffService.loadUserByUsername("kassir"))
                .thenReturn(new CustomUserDetails(staff(true)));

        runFilter("/v1/ws/info");

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("/v1/ws/** JWT filtridan o'tmaydi — token STOMP interceptor'da tekshiriladi")
                .isNull();
    }

    @Test
    @DisplayName("Refresh token API so'roviga access token sifatida o'tmaydi")
    void refreshTokenIsRejectedAsAccessCredential() throws Exception {
        when(tokenProvider.isRefreshToken(anyString())).thenReturn(true);

        runFilter();

        assertThat(SecurityContextHolder.getContext().getAuthentication())
                .as("refresh token faqat /refresh-token uchun — API kirishga yaramaydi")
                .isNull();
    }
}
