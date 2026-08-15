package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.AccountDisabledException;
import uz.shinamagazin.api.repository.SessionRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;
import uz.shinamagazin.api.util.UserAgentParser;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Refresh token oqimi — sessiyaga bog'langan rotatsiya.
 *
 * <p>Asosiy invariantlar:
 * <ul>
 *   <li>refresh BERGAN access token filtrdan o'tishi kerak (sessiya rotatsiyasi);
 *   <li>refresh faqat TIRIK sessiya bilan ishlaydi — logout/parol
 *       almashtirish/deaktivatsiya refresh tokenni ham o'ldiradi;
 *   <li>rotatsiyadan chiqqan eski refresh token qayta kelsa, butun sessiya
 *       bekor qilinadi (o'g'irlangan token belgisi);
 *   <li>sessiyaning mutlaq muddati bor — kunda bir yangilab turgan qurilma
 *       abadiy kirishda qolmaydi.
 * </ul>
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

    private static final String REFRESH = "refresh-token-1";

    @Autowired private UserRepository userRepository;
    @Autowired private SessionRepository sessionRepository;
    @Autowired private jakarta.persistence.EntityManager entityManager;

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

        // Sessiya qatlami REAL: rotatsiya, reuse-detection va revocation
        // invariantlari aynan shu testlarda qulflanadi.
        sessionService = new SessionService(sessionRepository, new UserAgentParser(),
                mock(NotificationDispatcher.class));

        service = new AuthService(mock(AuthenticationManager.class), tokenProvider,
                userRepository, sessionService, mock(LoginAttemptService.class));
        ReflectionTestUtils.setField(service, "jwtExpiration", 86_400_000L);
        ReflectionTestUtils.setField(service, "refreshExpiration", 604_800_000L);
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

    /** Login paytida ochilgan sessiya — access va refresh hashlari bilan. */
    private Session loginSession(User owner) {
        return sessionService.createSession(owner, "initial-access", REFRESH,
                "10.0.0.1", "Mozilla/5.0", LocalDateTime.now().plusHours(24));
    }

    private JwtResponse refresh(String token) {
        return service.refreshToken(token, "10.0.0.1", "Mozilla/5.0");
    }

    @Test
    @DisplayName("Refresh AYNI sessiyada tokenlarni rotatsiya qiladi — yangi access tirik")
    void refreshRotatesTokensWithinSameSession() {
        User owner = user(true);
        Session session = loginSession(owner);

        JwtResponse response = refresh(REFRESH);

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(sessionService.isSessionValid("new-access"))
                .as("filtr aynan shu tekshiruvni qiladi")
                .isTrue();
        assertThat(sessionService.isSessionValid("initial-access"))
                .as("eski access hash almashdi — endi o'tmaydi")
                .isFalse();
        assertThat(sessionRepository.count())
                .as("yangi qator OCHILMAYDI — mavjud sessiya rotatsiya qilinadi")
                .isEqualTo(1);
        assertThat(sessionService.findActiveSessionByRefreshToken("new-refresh"))
                .get()
                .satisfies(s -> assertThat(s.getId()).isEqualTo(session.getId()));
    }

    @Test
    @DisplayName("Sessiyasiz refresh token rad etiladi")
    void refreshWithoutSessionRejected() {
        user(true);

        assertThatThrownBy(() -> refresh("unknown-refresh"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
    }

    // Q1 ning mag'zi: logout / parol almashtirish / admin revoke sessiyani
    // o'chiradi — endi refresh token ham shu zahoti o'ladi.
    @Test
    @DisplayName("Bekor qilingan sessiyaning refresh tokeni ishlamaydi")
    void refreshAfterRevocationRejected() {
        User owner = user(true);
        Session session = loginSession(owner);
        session.setIsActive(false);
        sessionRepository.saveAndFlush(session);

        assertThatThrownBy(() -> refresh(REFRESH))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
    }

    @Test
    @DisplayName("Rotatsiyadan chiqqan eski refresh token qayta kelsa — butun sessiya yopiladi")
    void reusedRefreshTokenRevokesWholeSession() {
        User owner = user(true);
        Session session = loginSession(owner);

        refresh(REFRESH); // rotatsiya: REFRESH -> previous, new-refresh -> joriy

        assertThatThrownBy(() -> refresh(REFRESH))
                .as("eski token endi yaroqsiz")
                .isInstanceOf(ResponseStatusException.class);

        assertThat(sessionRepository.findById(session.getId()))
                .get()
                .satisfies(s -> {
                    assertThat(s.getIsActive())
                            .as("o'g'irlangan token belgisi — sessiya butunlay yopiladi")
                            .isFalse();
                    assertThat(s.getRevokeReason()).contains("qayta ishlatildi");
                });

        assertThatThrownBy(() -> refresh("new-refresh"))
                .as("yopilgan sessiyada YANGI juftlik ham ishlamaydi")
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("Sessiyaning mutlaq muddati tugagach refresh rad etiladi va sessiya yopiladi")
    void absoluteLifetimeExpiresSessionFamily() {
        User owner = user(true);
        Session session = loginSession(owner);
        // created_at 8 kun orqaga suriladi (@CreatedDate saqlashda ustidan yozadi)
        entityManager.createQuery("UPDATE Session s SET s.createdAt = :ts WHERE s.id = :id")
                .setParameter("ts", LocalDateTime.now().minusDays(8))
                .setParameter("id", session.getId())
                .executeUpdate();
        entityManager.clear();

        assertThatThrownBy(() -> refresh(REFRESH))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("muddati tugadi");
        assertThat(sessionRepository.findById(session.getId()))
                .get()
                .satisfies(s -> assertThat(s.getIsActive()).isFalse());
    }

    @Test
    @DisplayName("Deaktivatsiya qilingan hisobga refresh token yangi token bermaydi")
    void refreshRejectsDeactivatedUser() {
        User owner = user(false);
        loginSession(owner);

        assertThatThrownBy(() -> refresh(REFRESH))
                .isInstanceOf(AccountDisabledException.class)
                .hasMessageContaining("faol emas");
    }

    @Test
    @DisplayName("Access token refresh sifatida qabul qilinmaydi")
    void refreshRejectsNonRefreshToken() {
        User owner = user(true);
        loginSession(owner);
        when(tokenProvider.isRefreshToken(anyString())).thenReturn(false);

        assertThatThrownBy(() -> refresh(REFRESH))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
    }

    @Test
    @DisplayName("Mijoz tokeni bilan staff token olib bo'lmaydi")
    void refreshRejectsCustomerToken() {
        User owner = user(true);
        loginSession(owner);
        when(tokenProvider.isCustomerToken(anyString())).thenReturn(true);

        assertThatThrownBy(() -> refresh(REFRESH))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("yaroqsiz");
    }

    @Test
    @DisplayName("Faol hisob uchun refresh token juftini qaytaradi")
    void refreshStillWorksForActiveUser() {
        User owner = user(true);
        loginSession(owner);

        JwtResponse response = refresh(REFRESH);

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }
}
