package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.AccountDisabledException;
import uz.shinamagazin.api.repository.SessionRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;
import uz.shinamagazin.api.util.UserAgentParser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Refresh token oqimi.
 *
 * <p>Asosiy invariant: refresh BERGAN access token filtrdan O'TISHI kerak.
 * Ilgari refresh sessiya yozuvi ochmasdi — filtr esa sessiyasiz staff tokenni
 * har doim rad etadi, ya'ni refresh 200 qaytarsa ham berilgan token o'lik edi:
 * har bir xodim 24 soatda bir qulflanib qolardi, 7 kunlik refresh muddati esa
 * o'lik kod edi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:auth-refresh;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuthServiceRefreshTest {

    @Autowired private UserRepository userRepository;
    @Autowired private SessionRepository sessionRepository;

    private AuthService service;
    private SessionService sessionService;
    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        sessionRepository.deleteAll();
        userRepository.deleteAll();

        tokenProvider = mock(JwtTokenProvider.class);
        when(tokenProvider.validateToken(anyString())).thenReturn(true);
        when(tokenProvider.isCustomerToken(anyString())).thenReturn(false);
        when(tokenProvider.isRefreshToken(anyString())).thenReturn(true);
        when(tokenProvider.getUsernameFromToken(anyString())).thenReturn("kassir");
        when(tokenProvider.generateStaffTokenWithPermissions(anyString(), anyLong(), any(), any()))
                .thenReturn("new-access");
        when(tokenProvider.generateStaffRefreshToken(anyString(), anyLong()))
                .thenReturn("new-refresh");

        // Sessiya qatlami REAL: aynan "sessiya yozildimi" degan savol
        // tekshirilmoqda — mock bilan bu invariant qulflanmasdi.
        sessionService = new SessionService(sessionRepository, new UserAgentParser(),
                mock(NotificationDispatcher.class));

        service = new AuthService(mock(AuthenticationManager.class), tokenProvider,
                userRepository, sessionService, mock(LoginAttemptService.class));
        // @Value maydoni qo'lda qurilganda 0 bo'lib qoladi — sessiya darhol
        // muddati o'tgan bo'lib, isSessionValid har doim false qaytarardi.
        org.springframework.test.util.ReflectionTestUtils.setField(service, "jwtExpiration", 86_400_000L);
    }

    private User user(boolean active) {
        return userRepository.saveAndFlush(User.builder()
                .username("kassir")
                .password("{noop}x")
                .fullName("Kassir Kassirov")
                .role(Role.SELLER)
                .active(active)
                .build());
    }

    private JwtResponse refresh() {
        return service.refreshToken("some-refresh-token", "10.0.0.1", "Mozilla/5.0");
    }

    @Test
    @DisplayName("Refresh bergan yangi access token uchun TIRIK sessiya ochiladi")
    void refreshCreatesLiveSessionForNewAccessToken() {
        user(true);

        JwtResponse response = refresh();

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(sessionService.isSessionValid("new-access"))
                .as("filtr aynan shu tekshiruvni qiladi — sessiyasiz token o'lik edi")
                .isTrue();
    }

    @Test
    @DisplayName("Deaktivatsiya qilingan hisobga refresh token yangi token bermaydi")
    void refreshRejectsDeactivatedUser() {
        user(false);

        assertThatThrownBy(this::refresh)
                .isInstanceOf(AccountDisabledException.class)
                .hasMessageContaining("faol emas");
        assertThat(sessionRepository.count())
                .as("rad etilgan refresh sessiya ochmasligi kerak")
                .isZero();
    }

    @Test
    @DisplayName("Access token refresh sifatida qabul qilinmaydi")
    void refreshRejectsNonRefreshToken() {
        user(true);
        when(tokenProvider.isRefreshToken(anyString())).thenReturn(false);

        assertThatThrownBy(this::refresh)
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
        assertThat(sessionRepository.count()).isZero();
    }

    @Test
    @DisplayName("Mijoz tokeni bilan staff token olib bo'lmaydi")
    void refreshRejectsCustomerToken() {
        user(true);
        when(tokenProvider.isCustomerToken(anyString())).thenReturn(true);

        assertThatThrownBy(this::refresh)
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
        assertThat(sessionRepository.count()).isZero();
    }

    @Test
    @DisplayName("Faol hisob uchun refresh token juftini qaytaradi")
    void refreshStillWorksForActiveUser() {
        user(true);

        JwtResponse response = refresh();

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }
}
