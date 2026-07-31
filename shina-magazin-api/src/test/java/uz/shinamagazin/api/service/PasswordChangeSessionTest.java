package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.repository.RoleRepository;
import uz.shinamagazin.api.repository.SessionRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Parol o'zgarganda SESSIYALAR bekor qilinishi.
 *
 * <p>Bu — parol o'zgartirishning asosiy maqsadi. Paroli o'g'irlangan
 * foydalanuvchi uni almashtiradi, lekin buzg'unchining ochiq sessiyasi
 * omon qolsa, almashtirish hech narsani hal qilmaydi: token hali ham
 * amal qiladi va {@code JwtAuthenticationFilter} uni o'tkazib yuboradi.
 *
 * <p>Bu yerdagi sessiya tekshiruvi haqiqiy: filtr har so'rovda
 * {@code sessionService.isSessionValid(jwt)} ni chaqiradi, ya'ni bekor
 * qilingan yozuv kirishni DARHOL to'xtatadi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:pwdsessions;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PasswordChangeSessionTest {

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private SessionRepository sessionRepository;

    private UserService service;
    private User user;

    private static final String OLD_PASSWORD = "EskiParol1!";

    @BeforeEach
    void setUp() {
        sessionRepository.deleteAll();
        userRepository.deleteAll();

        PasswordEncoder encoder = new BCryptPasswordEncoder();
        service = new UserService(userRepository, roleRepository, encoder,
                Mockito.mock(AuditLogService.class), sessionRepository);

        user = userRepository.saveAndFlush(User.builder()
                .username("kassir")
                .password(encoder.encode(OLD_PASSWORD))
                .fullName("Kassir Kassirov")
                .role(Role.SELLER)
                .active(true)
                .build());
    }

    /** Boshqa qurilmadagi ochiq sessiya. */
    private Session openSession(String tokenHash) {
        return sessionRepository.saveAndFlush(Session.builder()
                .user(user)
                .tokenHash(tokenHash)
                .ipAddress("10.0.0.1")
                .userAgent("Mozilla/5.0")
                .expiresAt(LocalDateTime.now().plusHours(12))
                .lastActivityAt(LocalDateTime.now())
                .isActive(true)
                .build());
    }

    @Test
    @DisplayName("Parol o'zgarganda barcha ochiq sessiyalar bekor qilinadi")
    void changePasswordRevokesSessions() {
        openSession("hash-telefon");
        openSession("hash-noutbuk");

        service.changePassword(user.getId(), OLD_PASSWORD, "YangiParol1!");

        List<Session> sessions = sessionRepository.findAll();
        assertThat(sessions).hasSize(2);
        assertThat(sessions).allSatisfy(s -> {
            assertThat(s.getIsActive()).isFalse();
            assertThat(s.getRevokedAt()).isNotNull();
        });
    }

    /**
     * Parolning O'ZI ham saqlanadi.
     *
     * <p>Sessiyalarni bekor qilish `clearAutomatically` bilan ishlaydi,
     * ya'ni u persistence kontekstini tozalaydi. Agar parol yozuvi undan
     * OLDIN flush qilinmasa, o'zgarish yo'qolardi — foydalanuvchi barcha
     * qurilmalardan chiqarilib, eski parol bilan qolardi.
     */
    @Test
    @DisplayName("Sessiyalar bekor qilinsa ham yangi parol saqlanadi")
    void newPasswordIsPersisted() {
        openSession("hash-telefon");
        PasswordEncoder encoder = new BCryptPasswordEncoder();

        service.changePassword(user.getId(), OLD_PASSWORD, "YangiParol1!");

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(encoder.matches("YangiParol1!", reloaded.getPassword())).isTrue();
        assertThat(encoder.matches(OLD_PASSWORD, reloaded.getPassword())).isFalse();
    }

    /**
     * Admin tomonidan parol tiklash ham xuddi shunday.
     *
     * <p>Bu aynan "hisob buzilgan" holatda ishlatiladi: admin parolni
     * tiklaydi. Sessiya qolsa, tiklashning ma'nosi yo'qoladi.
     */
    @Test
    @DisplayName("Admin parolni tiklaganda ham sessiyalar bekor qilinadi")
    void resetPasswordRevokesSessions() {
        openSession("hash-buzgunchi");

        service.resetPassword(user.getId());

        assertThat(sessionRepository.findAll())
                .allSatisfy(s -> assertThat(s.getIsActive()).isFalse());
    }

    /**
     * Joriy parol xato bo'lsa hech narsa o'zgarmaydi.
     *
     * <p>Aks holda parolni bilmagan odam ham egasini tizimdan
     * chiqarib yuborishi mumkin bo'lardi.
     */
    @Test
    @DisplayName("Joriy parol xato bo'lsa sessiyalar tegilmaydi")
    void wrongCurrentPasswordKeepsSessions() {
        openSession("hash-telefon");

        try {
            service.changePassword(user.getId(), "NotogriParol1!", "YangiParol1!");
        } catch (IllegalArgumentException expected) {
            // kutilgan
        }

        assertThat(sessionRepository.findAll())
                .allSatisfy(s -> assertThat(s.getIsActive()).isTrue());
    }

    /** Boshqa foydalanuvchining sessiyasiga tegilmaydi. */
    @Test
    @DisplayName("Boshqa foydalanuvchining sessiyasi tegilmaydi")
    void otherUsersSessionsUntouched() {
        User other = userRepository.saveAndFlush(User.builder()
                .username("boshqa")
                .password("x")
                .fullName("Boshqa Odam")
                .role(Role.SELLER)
                .active(true)
                .build());
        Session otherSession = sessionRepository.saveAndFlush(Session.builder()
                .user(other)
                .tokenHash("hash-boshqa")
                .expiresAt(LocalDateTime.now().plusHours(12))
                .lastActivityAt(LocalDateTime.now())
                .isActive(true)
                .build());

        service.changePassword(user.getId(), OLD_PASSWORD, "YangiParol1!");

        assertThat(sessionRepository.findById(otherSession.getId()))
                .get()
                .satisfies(s -> assertThat(s.getIsActive()).isTrue());
    }
}
