package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URL;
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
 * boshqa hech bir test ushlay olmaydi: xato faqat ilovani ishga
 * tushirganda chiqadi.
 *
 * <p>Ikki joy ham tekshiriladi, chunki ular mustaqil ravishda buziladi:
 * <ul>
 *   <li><b>manba</b> — ikki kishi (yoki ikki parallel sessiya) bir xil
 *       versiya raqamini tanlaganda. V38 bilan shunday bo'lgan.</li>
 *   <li><b>classpath</b> — Flyway aslida shuni o'qiydi. Migratsiya
 *       qayta nomlanganda Maven eski nusxani {@code target/classes} dan
 *       O'CHIRMAYDI ({@code clean} qilinmagunicha), natijada manba toza
 *       bo'la turib ilova ko'tarilmaydi. V40 bilan shunday bo'lgan.</li>
 * </ul>
 */
class FlywayMigrationNamingTest {

    /** Surefire ishchi katalogi — modul ildizi. */
    private static final Path SOURCE_MIGRATIONS = Path.of("src/main/resources/db/migration");

    private static final String CLASSPATH_MIGRATIONS = "/db/migration";

    private static final Pattern VERSIONED = Pattern.compile("^V(\\d+)__.+\\.sql$");

    @Test
    @DisplayName("Manbada bitta versiya raqami faqat bitta migratsiyaga tegishli")
    void sourceVersionNumbersAreUnique() throws IOException {
        assertThat(SOURCE_MIGRATIONS)
                .as("migratsiyalar katalogi topilmadi — test yo'li eskirgan")
                .isDirectory();

        assertNoDuplicates(SOURCE_MIGRATIONS, "manbada takrorlangan versiyalar");
    }

    @Test
    @DisplayName("Classpath'da eskirgan nusxa qolmagan (mvn clean kerak emas)")
    void classpathVersionNumbersAreUnique() throws IOException {
        URL url = getClass().getResource(CLASSPATH_MIGRATIONS);
        assertThat(url).as("classpath'da " + CLASSPATH_MIGRATIONS + " topilmadi").isNotNull();
        // Jar ichidan ishga tushirilganda katalog sifatida o'qib bo'lmaydi —
        // bunday holatda tekshiruvni o'tkazib yuboramiz (surefire'da doim "file").
        if (!"file".equals(url.getProtocol())) {
            return;
        }

        assertNoDuplicates(
                Path.of(java.net.URI.create(url.toString())),
                "classpath'da takrorlangan versiyalar — eskirgan build natijasi, `mvn clean` kerak");
    }

    private void assertNoDuplicates(Path dir, String description) throws IOException {
        Map<String, List<String>> duplicates = versionedMigrations(dir).entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        assertThat(duplicates).as(description).isEmpty();
    }

    private Map<String, List<String>> versionedMigrations(Path dir) throws IOException {
        try (Stream<Path> files = Files.list(dir)) {
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
