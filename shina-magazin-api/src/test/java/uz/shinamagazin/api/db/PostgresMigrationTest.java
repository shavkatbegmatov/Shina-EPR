package uz.shinamagazin.api.db;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Migratsiyalar HAQIQIY PostgreSQL'da ishlashi va entity modeli sxemaga mos kelishi.
 *
 * <p>Qolgan barcha testlar H2'da (PostgreSQL rejimida) va Flyway o'chiq holda yuradi.
 * Ya'ni 42 ta qo'lda yozilgan migratsiya, Postgres'ga xos SQL ({@code ON CONFLICT},
 * {@code bytea} cast'lari) va {@code ddl-auto=validate} prod'ga chiqqunga qadar hech
 * qayerda tekshirilmasdi — sinib qolgan migratsiya faqat deploy paytida bilinardi,
 * orqaga qaytarish esa faqat backup orqali.
 *
 * <p>Docker bo'lmasa test o'tkazib yuboriladi (lokal mashinada); CI (GitHub Actions)
 * runner'ida Docker bor.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class PostgresMigrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

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
    void migrationsApplyAndSchemaValidates() {
        MigrationInfo current = flyway.info().current();

        assertThat(current).as("kamida bitta migratsiya qo'llangan").isNotNull();
        assertThat(flyway.info().pending()).as("kutilayotgan migratsiya qolmagan").isEmpty();
        assertThat(current.getVersion().getVersion())
                .as("oxirgi versiya — db/migration'dagi eng katta V raqami")
                .isEqualTo("42");
    }
}
