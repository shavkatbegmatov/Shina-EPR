package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.authentication.AuthenticationManager;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.exception.AccountDisabledException;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Refresh token va deaktivatsiya.
 *
 * <p>Hisob o'chirilgach, refresh endpoint yangi token (va u bilan birga
 * to'liq user/permission ma'lumotini) bermasligi kerak — aks holda
 * bo'shatilgan xodim refresh orqali kirishni uzaytirib yura olardi.
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

    private AuthService service;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        JwtTokenProvider tokenProvider = mock(JwtTokenProvider.class);
        when(tokenProvider.validateToken(anyString())).thenReturn(true);
        when(tokenProvider.getUsernameFromToken(anyString())).thenReturn("kassir");
        when(tokenProvider.generateStaffTokenWithPermissions(anyString(), anyLong(), any(), any()))
                .thenReturn("new-access");
        when(tokenProvider.generateStaffRefreshToken(anyString(), anyLong()))
                .thenReturn("new-refresh");

        service = new AuthService(mock(AuthenticationManager.class), tokenProvider,
                userRepository, mock(SessionService.class), mock(LoginAttemptService.class));
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

    @Test
    @DisplayName("Deaktivatsiya qilingan hisobga refresh token yangi token bermaydi")
    void refreshRejectsDeactivatedUser() {
        user(false);

        assertThatThrownBy(() -> service.refreshToken("some-refresh-token"))
                .isInstanceOf(AccountDisabledException.class)
                .hasMessageContaining("faol emas");
    }

    @Test
    @DisplayName("Faol hisob uchun refresh ishlashda davom etadi")
    void refreshStillWorksForActiveUser() {
        user(true);

        JwtResponse response = service.refreshToken("some-refresh-token");

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }
}
