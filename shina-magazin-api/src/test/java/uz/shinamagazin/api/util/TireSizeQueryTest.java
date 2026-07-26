package uz.shinamagazin.api.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mijoz katalogda odatda aynan o'lchamni yozadi ("205/55R16"). Ilgari qidiruv
 * faqat nom/SKU/brend bo'yicha LIKE qilardi — o'lcham mahsulot NOMIDA bo'lmasa
 * hech narsa topilmasdi, holbuki u alohida ustunlarda saqlanadi.
 */
class TireSizeQueryTest {

    @ParameterizedTest(name = "\"{0}\" -> {1}/{2}R{3}")
    @CsvSource({
            "205/55R16,   205, 55, 16",
            "205/55r16,   205, 55, 16",
            "205/55 R16,  205, 55, 16",
            "205/55-16,   205, 55, 16",
            "205/55/16,   205, 55, 16",
            "205 55 16,   205, 55, 16",
            "225/45R17,   225, 45, 17",
            "315/35 r20,  315, 35, 20",
    })
    @DisplayName("To'liq o'lcham turli yozuvlarda tanib olinadi")
    void parsesFullSize(String query, int width, int profile, int diameter) {
        TireSizeQuery size = TireSizeQuery.parse(query);

        assertThat(size.width()).isEqualTo(width);
        assertThat(size.profile()).isEqualTo(profile);
        assertThat(size.diameter()).isEqualTo(diameter);
    }

    @Test
    @DisplayName("Diametrsiz o'lcham (205/55)")
    void parsesWidthAndProfileOnly() {
        TireSizeQuery size = TireSizeQuery.parse("205/55");

        assertThat(size.width()).isEqualTo(205);
        assertThat(size.profile()).isEqualTo(55);
        assertThat(size.diameter()).isNull();
        assertThat(size.hasAnySize()).isTrue();
    }

    @Test
    @DisplayName("Faqat diametr (R16)")
    void parsesDiameterOnly() {
        TireSizeQuery size = TireSizeQuery.parse("R16");

        assertThat(size.width()).isNull();
        assertThat(size.diameter()).isEqualTo(16);
        assertThat(size.hasAnySize()).isTrue();
    }

    @Test
    @DisplayName("Brend + o'lcham: o'lcham ajratiladi, qolgan matn saqlanadi")
    void separatesBrandFromSize() {
        TireSizeQuery size = TireSizeQuery.parse("michelin 205/55r16");

        assertThat(size.width()).isEqualTo(205);
        assertThat(size.diameter()).isEqualTo(16);
        assertThat(size.remainingText())
                .as("qolgan matn brend bo'yicha qidirishda ishlatiladi")
                .isEqualTo("michelin");
    }

    @Test
    @DisplayName("Faqat o'lcham yozilsa qolgan matn bo'sh")
    void noRemainingTextForPureSize() {
        assertThat(TireSizeQuery.parse("205/55R16").remainingText()).isNull();
    }

    // Bu eng muhim guruh: oddiy qidiruvni o'lcham deb talqin qilmaslik kerak,
    // aks holda "Michelin 2024" kabi so'rov noto'g'ri filtrlanardi.
    @ParameterizedTest
    @ValueSource(strings = {
            "michelin",
            "bridgestone blizzak",
            "2024",
            "SKU-12345",
            "999/99R99",     // diapazondan tashqari
            "100/10R5",      // juda kichik
            "",
            "   ",
    })
    @DisplayName("O'lcham bo'lmagan so'rovlar filtrga aylanmaydi")
    void doesNotMisinterpretOrdinarySearches(String query) {
        TireSizeQuery size = TireSizeQuery.parse(query);

        assertThat(size.hasAnySize())
                .as("\"%s\" o'lcham deb talqin qilinmasligi kerak", query)
                .isFalse();
    }

    @Test
    @DisplayName("null xavfsiz")
    void handlesNull() {
        assertThat(TireSizeQuery.parse(null).hasAnySize()).isFalse();
    }
}
