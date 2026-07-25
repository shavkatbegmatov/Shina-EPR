package uz.shinamagazin.api.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assumptions.assumeThat;

/**
 * Haqiqiy `application.yml` / `application-dev.yml` fayllarini yuklab, JWT kaliti
 * konfiguratsiyasining IKKALA tomonini ham tekshiradi:
 *
 * <ul>
 *   <li><b>dev</b> — kalit mavjud bo'lishi kerak, aks holda lokal ishlab chiqish buziladi;</li>
 *   <li><b>prod</b> — default BO'LMASLIGI kerak, aks holda JWT_SECRET unutilgan deployment
 *       jimgina repo'dagi ma'lum kalit bilan imzolab ketadi (fail-open).</li>
 * </ul>
 *
 * Bu ikkisi bir-biriga qarama-qarshi, shuning uchun ikkalasini birga qulflash kerak:
 * faqat birini tekshirsak, ikkinchisini buzib qo'yish oson.
 */
class JwtSecretConfigurationTest {

    /** Ilgari application.yml'da default bo'lgan, endi ishonchsiz kalit. */
    private static final String LEAKED_SECRET = "mS1mNCtIuahtLE4Q/OW/eQc/11mONeSU5T1dcGnwX0M=";

    private ApplicationContextRunner runnerWithProfile(String profile) {
        return new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("spring.profiles.active=" + profile);
    }

    @Test
    @DisplayName("dev: JWT_SECRET env'siz ham kalit topiladi (lokal ishlab chiqish buzilmaydi)")
    void devProfileHasUsableSecret() {
        runnerWithProfile("dev").run(context -> {
            String secret = context.getEnvironment().getProperty("jwt.secret");
            assertThat(secret).isNotBlank();
            assertThat(secret).isNotEqualTo(LEAKED_SECRET);
        });
    }

    @Test
    @DisplayName("prod: JWT_SECRET berilmasa kalit HAL BO'LMAYDI — ilova ishga tushmasligi kerak")
    void prodProfileHasNoFallbackSecret() {
        // Ishlab chiquvchi mashinasida JWT_SECRET o'rnatilgan bo'lishi mumkin —
        // u holda bu tekshiruv ma'nosiz (kalit env'dan keladi, default'dan emas).
        assumeThat(System.getenv("JWT_SECRET"))
                .as("JWT_SECRET env o'rnatilmagan bo'lishi kerak")
                .isNull();

        runnerWithProfile("prod").run(context ->
                assertThatThrownBy(() -> context.getEnvironment().getProperty("jwt.secret"))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("JWT_SECRET"));
    }
}
