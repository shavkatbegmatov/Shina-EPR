package uz.shinamagazin.api.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@code TimeZone.setDefault} FAQAT {@code main} da chaqirilsin.
 *
 * <p>U butun JVM'ga ta'sir qiladi. Ilova ishlash paytida — masalan
 * {@code @Configuration} ning {@code @PostConstruct} ida — chaqirilsa, o'sha
 * paytgacha ko'tarilgan ulanishlar hovuzi, Hibernate va boshqa testlar boshqa
 * zonada qolib ketadi.
 *
 * <p>10.09.2026 gacha shunday {@code TimezoneConfig} bor edi va backend testlari
 * sinflar TARTIBIGA bog'liq bo'lib qolgandi: yagona {@code @SpringBootTest}
 * kontekst ko'targanda JVM zonasi UTC'dan Toshkentga o'zgarardi, keyin ishlagan
 * {@code ProfitLossReportTest} da esa kunlik hisobot xarajatlari nolga aylanardi.
 * CI'da bu bir necha kun davomida goh chiqib, goh chiqmasdi. Sabab shu qatorda
 * ekani ikki tajriba bilan tasdiqlangan: (1) o'sha sinf o'chirilganda,
 * (2) runner JVM'i allaqachon Toshkent zonasida ishga tushirilganda — ikkalasida
 * ham aynan o'sha tasodifiy tartib (urug' 608826499769) muammosiz o'tdi.
 */
class TimezoneMutationGuardTest {

    private static final Path MAIN_SOURCES = Path.of("src/main/java");
    private static final String ENTRY_POINT = "ShinaMagazinApiApplication.java";

    @Test
    @DisplayName("TimeZone.setDefault faqat ilova kirish nuqtasida chaqiriladi")
    void timeZoneIsSetOnlyInMain() throws IOException {
        assertThat(MAIN_SOURCES).as("manba papkasi topilmadi — test noto'g'ri katalogdan ishlayapti").exists();

        List<String> offenders;
        try (Stream<Path> files = Files.walk(MAIN_SOURCES)) {
            offenders = files
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !p.getFileName().toString().equals(ENTRY_POINT))
                    .filter(TimezoneMutationGuardTest::mutatesDefaultTimeZone)
                    .map(p -> MAIN_SOURCES.relativize(p).toString())
                    .toList();
        }

        assertThat(offenders)
                .as("TimeZone.setDefault butun JVM'ga ta'sir qiladi — uni %s dagi `main` ga ko'chiring", ENTRY_POINT)
                .isEmpty();
    }

    private static boolean mutatesDefaultTimeZone(Path file) {
        try {
            return Files.readString(file).contains("TimeZone.setDefault");
        } catch (IOException e) {
            throw new IllegalStateException("O'qib bo'lmadi: " + file, e);
        }
    }
}
