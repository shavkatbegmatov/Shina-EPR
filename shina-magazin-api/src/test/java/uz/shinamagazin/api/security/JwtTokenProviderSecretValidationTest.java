package uz.shinamagazin.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * JWT imzo kaliti validatsiyasi — ilova zaif yoki ishonchsiz kalit bilan
 * ISHGA TUSHMASLIGI kerak (fail-closed).
 *
 * Tarixiy muammo: application.yml'da `${JWT_SECRET:mS1mNCt...}` ko'rinishida
 * ishlaydigan default turardi. JWT_SECRET o'rnatilmagan deployment repo'dagi
 * kalit bilan imzolardi — ya'ni repoga kirgan har kim istalgan xodim yoki mijoz
 * uchun token soxtalashtira olardi.
 */
class JwtTokenProviderSecretValidationTest {

    /** Ilgari application.yml'da default bo'lgan, endi ishonchsiz deb belgilangan kalit. */
    private static final String COMPROMISED = "mS1mNCtIuahtLE4Q/OW/eQc/11mONeSU5T1dcGnwX0M=";
    private static final String VALID = "JyhYCX/C4dqsliMYHB635TPrujj0WEY+IglVoEWmwvA=";

    @Test
    void acceptsStrongSecret() {
        assertDoesNotThrow(() -> initWith(VALID));
    }

    @Test
    void rejectsBlankSecret() {
        assertTrue(messageOf(assertThrows(IllegalStateException.class, () -> initWith("   ")))
                .contains("JWT_SECRET"));
    }

    @Test
    void rejectsNullSecret() {
        assertThrows(IllegalStateException.class, () -> initWith(null));
    }

    @Test
    void rejectsPreviouslyLeakedDefaultSecret() {
        String message = messageOf(
                assertThrows(IllegalStateException.class, () -> initWith(COMPROMISED)));
        assertTrue(message.contains("eski default"),
                "sizib ketgan kalit aniq sabab bilan rad etilishi kerak, xabar: " + message);
    }

    @Test
    void rejectsSecretShorterThanHs256Minimum() {
        // 16 bayt = 128 bit — HS256 uchun yetarli emas
        String tooShort = java.util.Base64.getEncoder().encodeToString(new byte[16]);
        assertTrue(messageOf(assertThrows(IllegalStateException.class, () -> initWith(tooShort)))
                .contains("qisqa"));
    }

    @Test
    void rejectsNonBase64Secret() {
        assertThrows(IllegalStateException.class, () -> initWith("bu base64 emas!!! ***"));
    }

    private static void initWith(String secret) {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", secret);
        provider.init();
    }

    private static String messageOf(Exception e) {
        return e.getMessage() == null ? "" : e.getMessage();
    }
}
