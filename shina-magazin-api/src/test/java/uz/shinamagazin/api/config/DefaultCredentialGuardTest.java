package uz.shinamagazin.api.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * `DefaultCredentialGuard` seed parollarini (admin123/seller123) haqiqatan
 * almashtirishini va allaqachon o'zgartirilgan parollarga TEGMASLIGINI tekshiradi.
 *
 * Encoder mock emas, haqiqiy BCrypt — `matches()` semantikasi (tuz, hash varianti)
 * shu tekshiruvning mag'zi bo'lgani uchun uni soxtalashtirish testni ma'nosiz qiladi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DefaultCredentialGuardTest {

    @Mock private UserRepository userRepository;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private DefaultCredentialGuard guard;

    @BeforeEach
    void setUp() {
        guard = new DefaultCredentialGuard(userRepository, encoder);
        ReflectionTestUtils.setField(guard, "rotationEnabled", true);
        ReflectionTestUtils.setField(guard, "configuredAdminPassword", "");
    }

    @Test
    void rotatesAccountStillUsingSeededDefaultPassword() {
        User admin = userWithPassword("admin", "admin123");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByUsername("seller")).thenReturn(Optional.empty());

        guard.run();

        User saved = captureSaved();
        assertFalse(encoder.matches("admin123", saved.getPassword()),
                "eski standart parol endi ishlamasligi kerak");
        assertTrue(saved.getMustChangePassword(),
                "birinchi kirishda parol almashtirish talab qilinishi kerak");
        assertNotNull(saved.getPasswordChangedAt());
    }

    @Test
    void leavesAccountAloneWhenPasswordWasAlreadyChanged() {
        User admin = userWithPassword("admin", "MenAllaqachonAlmashtirdim!42");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByUsername("seller")).thenReturn(Optional.empty());

        guard.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void usesConfiguredAdminPasswordWhenProvided() {
        ReflectionTestUtils.setField(guard, "configuredAdminPassword", "Sirli-Parol-2026");
        User admin = userWithPassword("admin", "admin123");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByUsername("seller")).thenReturn(Optional.empty());

        guard.run();

        assertTrue(encoder.matches("Sirli-Parol-2026", captureSaved().getPassword()));
    }

    @Test
    void sellerGetsRandomPasswordEvenWhenAdminPasswordConfigured() {
        ReflectionTestUtils.setField(guard, "configuredAdminPassword", "Sirli-Parol-2026");
        User seller = userWithPassword("seller", "seller123");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("seller")).thenReturn(Optional.of(seller));

        guard.run();

        User saved = captureSaved();
        assertFalse(encoder.matches("seller123", saved.getPassword()));
        assertFalse(encoder.matches("Sirli-Parol-2026", saved.getPassword()),
                "admin paroli seller akkauntiga qo'yilmasligi kerak");
    }

    @Test
    void doesNothingWhenRotationDisabled() {
        ReflectionTestUtils.setField(guard, "rotationEnabled", false);

        guard.run();

        verify(userRepository, never()).findByUsername(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void rotatesBothSeededAccountsInOneRun() {
        when(userRepository.findByUsername("admin"))
                .thenReturn(Optional.of(userWithPassword("admin", "admin123")));
        when(userRepository.findByUsername("seller"))
                .thenReturn(Optional.of(userWithPassword("seller", "seller123")));

        guard.run();

        verify(userRepository, org.mockito.Mockito.times(2)).save(any(User.class));
    }

    private User userWithPassword(String username, String rawPassword) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(encoder.encode(rawPassword));
        user.setMustChangePassword(false);
        return user;
    }

    private User captureSaved() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        return captor.getValue();
    }
}
