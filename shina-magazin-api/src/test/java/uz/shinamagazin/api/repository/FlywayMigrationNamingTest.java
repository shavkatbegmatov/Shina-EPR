package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Migratsiya fayllari nomlanishining qorovuli.
 *
 * <p>Ikkita fayl bir xil versiya raqamiga ega bo'lsa, Flyway ilova ishga
 * tushishida {@code Found more than one migration with version N} bilan
 * yiqiladi — ya'ni backend prodda restart tsikliga tushadi. Barcha
 * testlarda {@code spring.flyway.enabled=false} bo'lgani uchun buni
 * boshqa hech bir test ushlay olmaydi: xato faqat deploy paytida chiqadi
 * (shunday hodisa V38 duplikati bilan bir marta yuz bergan).
 */
class FlywayMigrationNamingTest {

    /** Surefire ishchi katalogi — modul ildizi. */
    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");

    private static final Pattern VERSIONED = Pattern.compile("^V(\\d+)__.+\\.sql$");

    @Test
    @DisplayName("Bitta versiya raqami faqat bitta migratsiyaga tegishli")
    void versionNumbersAreUnique() throws IOException {
        Map<String, List<String>> byVersion = versionedMigrations();

        Map<String, List<String>> duplicates = byVersion.entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        assertThat(duplicates)
                .as("takrorlangan versiyalar — Flyway startupda yiqiladi")
                .isEmpty();
    }

    private Map<String, List<String>> versionedMigrations() throws IOException {
        assertThat(MIGRATIONS)
                .as("migratsiyalar katalogi topilmadi — test yo'li eskirgan")
                .isDirectory();

        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            return files.map(p -> p.getFileName().toString())
                    .filter(name -> VERSIONED.matcher(name).matches())
                    .collect(Collectors.groupingBy(FlywayMigrationNamingTest::version));
        }
    }

    /** {@code V38__foo.sql} → {@code 38}. Boshidagi nollar ahamiyatsiz: Flyway
     *  V007 va V7 ni bir xil versiya deb hisoblaydi. */
    private static String version(String fileName) {
        Matcher m = VERSIONED.matcher(fileName);
        m.matches();
        return m.group(1).replaceFirst("^0+(?=\\d)", "");
    }
}
