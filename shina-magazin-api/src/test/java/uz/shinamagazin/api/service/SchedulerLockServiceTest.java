package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.PlatformTransactionManager;
import uz.shinamagazin.api.repository.SchedulerLockRepository;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Vazifa qulfi: ikki instansiya bir vazifani bir vaqtda bajarmasligi.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:scheduler-lock;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SchedulerLockServiceTest {

    @Autowired private SchedulerLockRepository repository;
    @Autowired private PlatformTransactionManager transactionManager;

    private SchedulerLockService service;
    private String name;

    @BeforeEach
    void setUp() {
        service = new SchedulerLockService(repository, transactionManager);
        // Qulflar REQUIRES_NEW bilan commit bo'ladi — testlar orasida qolmasin deb nomi noyob
        name = "job-" + UUID.randomUUID();
    }

    @Test
    @DisplayName("Ikkinchi olish urinishi band qulfni ololmaydi, bo'shatilgach oladi")
    void secondAcquireFailsUntilReleased() {
        assertThat(service.tryAcquire(name, Duration.ofMinutes(5))).isTrue();
        assertThat(service.tryAcquire(name, Duration.ofMinutes(5)))
                .as("qulf band — ikkinchi instansiya o'tkazib yuboradi")
                .isFalse();

        service.release(name);

        assertThat(service.tryAcquire(name, Duration.ofMinutes(5))).isTrue();
    }

    @Test
    @DisplayName("Muddati o'tgan qulf (egasi yiqilgan) qayta olinadi")
    void expiredLockCanBeTakenOver() {
        assertThat(service.tryAcquire(name, Duration.ofMillis(-1000))).isTrue();

        assertThat(service.tryAcquire(name, Duration.ofMinutes(5)))
                .as("TTL o'tgan — yangi egasi olib ketadi")
                .isTrue();
    }

    @Test
    @DisplayName("runExclusively vazifani bir marta bajaradi va qulfni bo'shatadi")
    void runExclusivelyExecutesOnceAndReleases() {
        AtomicInteger runs = new AtomicInteger();

        assertThat(service.runExclusively(name, Duration.ofMinutes(5), runs::incrementAndGet)).isTrue();
        assertThat(service.runExclusively(name, Duration.ofMinutes(5), runs::incrementAndGet))
                .as("bo'shatilgan — qayta bajariladi")
                .isTrue();
        assertThat(runs.get()).isEqualTo(2);
    }

    @Test
    @DisplayName("Vazifa yiqilsa ham qulf bo'shatiladi")
    void lockReleasedWhenTaskThrows() {
        try {
            service.runExclusively(name, Duration.ofMinutes(5), () -> {
                throw new IllegalStateException("boom");
            });
        } catch (IllegalStateException expected) {
            // vazifa xatosi chaqiruvchiga yetadi
        }

        assertThat(service.tryAcquire(name, Duration.ofMinutes(5))).isTrue();
    }
}
