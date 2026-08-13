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
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token-123");
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
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
