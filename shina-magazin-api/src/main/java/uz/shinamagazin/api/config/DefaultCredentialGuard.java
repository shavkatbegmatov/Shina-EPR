package uz.shinamagazin.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.repository.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Standart (repoda ochiq turgan) parollarni ishga tushishda zararsizlantiradi.
 *
 * <p>Muammo: {@code V2__seed_data.sql} / {@code V3__update_user_passwords.sql}
 * {@code admin/admin123} va {@code seller/seller123} akkauntlarini yaratadi, bu
 * fayllar esa {@code db/migration} ichida — ya'ni productionda ham ishlaydi.
 * Hash'lar git tarixida ochiq, demak parollar ommaviy.
 *
 * <p>Yechim: har ishga tushishda parol hali ham ma'lum standart qiymatda ekanini
 * tekshiramiz ({@link PasswordEncoder#matches}) va topilsa almashtiramiz.
 * Tekshiruv hash satrini emas, parolning O'ZINI solishtiradi — shuning uchun
 * qaysi seed versiyasi yozilganidan qat'i nazar ishlaydi.
 *
 * <p>Yangi parol manbai:
 * <ul>
 *   <li>{@code ADMIN_INITIAL_PASSWORD} env o'rnatilgan bo'lsa — o'sha ishlatiladi
 *       (tavsiya etiladigan yo'l: parol logga umuman tushmaydi);</li>
 *   <li>aks holda — kriptografik tasodifiy parol generatsiya qilinadi va WARN
 *       logga BIR MARTA yoziladi, egasi konteyner logidan olib kirishi uchun.</li>
 * </ul>
 *
 * <p>Har ikkala holatda ham {@code must_change_password = true} qo'yiladi.
 * Akkaunt o'chirilmaydi va faolsizlantirilmaydi — egasi tizimdan qulflanib
 * qolmasligi kerak.
 *
 * <p>Dev profilida ishlamaydi: lokal ishlab chiqishda {@code admin/admin123}
 * qulayligi saqlanadi (demo ma'lumot ham faqat dev'da yuklanadi).
 *
 * @see uz.shinamagazin.api.config.TestDataInitializer dev profilidagi juftligi
 */
@Component
@Profile("!dev")
@RequiredArgsConstructor
@Slf4j
public class DefaultCredentialGuard implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /** Zararsizlantirilishi kerak bo'lgan seed akkauntlar: username -> ma'lum standart parol. */
    private static final Map<String, String> KNOWN_DEFAULTS = new LinkedHashMap<>() {{
        put("admin", "admin123");
        put("seller", "seller123");
    }};

    private static final String PASSWORD_ALPHABET =
            "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#%+=?";
    private static final int GENERATED_PASSWORD_LENGTH = 20;

    private static final SecureRandom RANDOM = new SecureRandom();

    /** Qorovulni butunlay o'chirish (masalan, allaqachon boshqa yo'l bilan tozalangan muhitda). */
    @Value("${app.security.default-credentials.rotate:true}")
    private boolean rotationEnabled;

    /** `admin` uchun boshlang'ich parol. Bo'sh bo'lsa — tasodifiy generatsiya qilinadi. */
    @Value("${app.security.default-credentials.admin-password:}")
    private String configuredAdminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (!rotationEnabled) {
            log.warn("Standart kreditsial qorovuli O'CHIRILGAN "
                    + "(app.security.default-credentials.rotate=false). "
                    + "Seed parollari o'zgarishsiz qolmoqda.");
            return;
        }

        KNOWN_DEFAULTS.forEach(this::rotateIfDefault);
    }

    private void rotateIfDefault(String username, String knownDefaultPassword) {
        userRepository.findByUsername(username).ifPresent(user -> {
            if (!passwordEncoder.matches(knownDefaultPassword, user.getPassword())) {
                return; // parol allaqachon almashtirilgan — tegmaymiz
            }

            boolean fromConfig = "admin".equals(username) && !configuredAdminPassword.isBlank();
            String newPassword = fromConfig ? configuredAdminPassword : generatePassword();

            user.setPassword(passwordEncoder.encode(newPassword));
            user.setMustChangePassword(true);
            user.setPasswordChangedAt(LocalDateTime.now());
            userRepository.save(user);

            if (fromConfig) {
                log.warn("XAVFSIZLIK: '{}' akkaunti standart parolda edi — "
                        + "ADMIN_INITIAL_PASSWORD dagi parolga almashtirildi. "
                        + "Birinchi kirishda parolni yangilash talab qilinadi.", username);
            } else {
                log.warn("""
                        XAVFSIZLIK: '{}' akkaunti ommaviy standart parolda edi va almashtirildi.
                        Yangi vaqtinchalik parol (faqat SHU MARTA ko'rsatiladi): {}
                        Kiring va darhol almashtiring. Bu logni saqlab qo'ymang.
                        Logga parol tushmasligi uchun keyingi safar ADMIN_INITIAL_PASSWORD env'ini o'rnating.""",
                        username, newPassword);
            }
        });
    }

    private static String generatePassword() {
        StringBuilder sb = new StringBuilder(GENERATED_PASSWORD_LENGTH);
        for (int i = 0; i < GENERATED_PASSWORD_LENGTH; i++) {
            sb.append(PASSWORD_ALPHABET.charAt(RANDOM.nextInt(PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
