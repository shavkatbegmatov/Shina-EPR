package uz.shinamagazin.api.db;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Migratsiyalar HAQIQIY PostgreSQL'da ishlashi va entity modeli sxemaga mos kelishi.
 *
 * <p>Qolgan barcha testlar H2'da (PostgreSQL rejimida) va Flyway o'chiq holda yuradi.
 * Ya'ni qo'lda yozilgan migratsiyalar, Postgres'ga xos SQL ({@code ON CONFLICT},
 * {@code bytea} cast'lari) va {@code ddl-auto=validate} prod'ga chiqqunga qadar hech
 * qayerda tekshirilmasdi — sinib qolgan migratsiya faqat deploy paytida bilinardi,
 * orqaga qaytarish esa faqat backup orqali.
 *
 * <p>Docker bo'lmasa test o'tkazib yuboriladi (lokal mashinada); CI (GitHub Actions)
 * runner'ida Docker bor.
 */
// Annotatsiya TARTIBI muhim: JUnit afterAll callback'larni teskari tartibda chaqiradi.
// @Testcontainers birinchi turgani uchun SpringExtension keyin ro'yxatdan o'tadi va
// uning afterAll'i (kontekstni yopish, @DirtiesContext) KONTEYNER TO'XTASHIDAN OLDIN
// ishlaydi. Aks holda Hikari o'lik konteynerga ulanishlarni yopishga urinib, JVM
// chiqishini 30 s ushlab turardi ("Surefire is going to kill self fork JVM").
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostgresMigrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static final Pattern VERSIONED = Pattern.compile("^V(\\d+)__.*\\.sql$");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private Flyway flyway;

    @Test
    @DisplayName("Barcha migratsiyalar Postgres'da qo'llanadi va entity'lar sxemaga mos (validate)")
    void migrationsApplyAndSchemaValidates() throws IOException {
        MigrationInfo current = flyway.info().current();

        assertThat(current).as("kamida bitta migratsiya qo'llangan").isNotNull();
        assertThat(flyway.info().pending()).as("kutilayotgan migratsiya qolmagan").isEmpty();
        assertThat(current.getVersion().getVersion())
                .as("oxirgi versiya — db/migration'dagi eng katta V raqami")
                .isEqualTo(String.valueOf(highestVersionOnClasspath()));
    }

    /** db/migration ichidagi eng katta V raqami — test har yangi migratsiyada qo'lda yangilanmasin. */
    private static int highestVersionOnClasspath() throws IOException {
        Resource[] scripts = new PathMatchingResourcePatternResolver()
                .getResources("classpath:db/migration/V*__*.sql");
        return Arrays.stream(scripts)
                .map(Resource::getFilename)
                .map(VERSIONED::matcher)
                .filter(Matcher::matches)
                .mapToInt(m -> Integer.parseInt(m.group(1)))
                .max()
                .orElseThrow(() -> new AssertionError("db/migration ichida V*__*.sql topilmadi"));
    }
}
