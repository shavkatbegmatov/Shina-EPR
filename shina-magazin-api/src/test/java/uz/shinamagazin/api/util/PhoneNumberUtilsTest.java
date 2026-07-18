package uz.shinamagazin.api.util;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PhoneNumberUtilsTest {

    @ParameterizedTest
    @CsvSource({
            "'+998901234567', '+998901234567'",
            "'+998 90 123 45 67', '+998901234567'",
            "'90 123 45 67', '+998901234567'",
            "'090-123-45-67', '+998901234567'"
    })
    void normalizesUzbekPhoneNumbers(String input, String expected) {
        assertEquals(expected, PhoneNumberUtils.normalize(input));
    }
}
