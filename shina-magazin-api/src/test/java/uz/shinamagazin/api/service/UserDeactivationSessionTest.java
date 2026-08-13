package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
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
 * Deaktivatsiya sessiyalarni ham bekor qilishi.
 *
 * <p>Bo'shatilgan xodimning hisobi o'chirilganda kirishi DARHOL to'xtashi
 * kerak. Ilgari faqat {@code active=false} yozilardi: filtr sessiya yozuviga
 * tayanib, foydalanuvchining active flagini tekshirmasdi — ochiq token bilan
 * xodim yana 24 soatgacha sotuvlar, qarzlar va mijozlar bilan ishlay olardi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:deactivation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserDeactivationSessionTest {

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private SessionRepository sessionRepository;

    private UserService service;
    private User user;

    @BeforeEach
    void setUp() {
        sessionRepository.deleteAll();
        userRepository.deleteAll();

        service = new UserService(userRepository, roleRepository, new BCryptPasswordEncoder(),
                Mockito.mock(AuditLogService.class), sessionRepository);

        user = userRepository.saveAndFlush(User.builder()
                .username("kassir")
                .password("{noop}x")
                .fullName("Kassir Kassirov")
                .role(Role.SELLER)
                .active(true)
                .build());
    }

    private Session openSession(User owner, String tokenHash) {
        return sessionRepository.saveAndFlush(Session.builder()
                .user(owner)
                .tokenHash(tokenHash)
                .ipAddress("10.0.0.1")
                .userAgent("Mozilla/5.0")
                .expiresAt(LocalDateTime.now().plusHours(12))
                .lastActivityAt(LocalDateTime.now())
                .isActive(true)
                .build());
    }

    @Test
    @DisplayName("Deaktivatsiyada barcha ochiq sessiyalar bekor qilinadi")
    void deactivateRevokesSessions() {
        openSession(user, "hash-dokon-kompyuteri");
        openSession(user, "hash-telefon");

        service.deactivateUser(user.getId());

        assertThat(userRepository.findById(user.getId()).orElseThrow().getActive()).isFalse();
        List<Session> sessions = sessionRepository.findAll();
        assertThat(sessions).hasSize(2);
        assertThat(sessions).allSatisfy(s -> {
            assertThat(s.getIsActive()).isFalse();
            assertThat(s.getRevokedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("Boshqa foydalanuvchining sessiyasi tegilmaydi")
    void otherUsersSessionsUntouched() {
        User other = userRepository.saveAndFlush(User.builder()
                .username("boshqa")
                .password("{noop}x")
                .fullName("Boshqa Odam")
                .role(Role.SELLER)
                .active(true)
                .build());
        Session otherSession = openSession(other, "hash-boshqa");

        service.deactivateUser(user.getId());

        assertThat(sessionRepository.findById(otherSession.getId()))
                .get()
                .satisfies(s -> assertThat(s.getIsActive()).isTrue());
    }

    @Test
    @DisplayName("Qayta aktivlashtirish eski sessiyalarni tiriltirmaydi")
    void reactivationDoesNotResurrectSessions() {
        openSession(user, "hash-eski");
        service.deactivateUser(user.getId());

        service.activateUser(user.getId());

        assertThat(userRepository.findById(user.getId()).orElseThrow().getActive()).isTrue();
        assertThat(sessionRepository.findAll())
                .as("xodim qaytadan login qilishi shart — eski token tirilmasligi kerak")
                .allSatisfy(s -> assertThat(s.getIsActive()).isFalse());
    }
}
