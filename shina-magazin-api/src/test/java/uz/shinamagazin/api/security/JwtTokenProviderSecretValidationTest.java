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

    // `openssl rand -base64 64` natijani 64 ustunda bo'lib chiqaradi; env maydoniga
    // nusxalanganda ichida satr belgisi qoladi. jjwt dekoderi (0.12.6 ham, 0.13.0
    // ham) ichki satr belgisini rad etadi — ilova umuman ishga tushmasdi.
    // Bo'shliq kalit mazmuniga ta'sir qilmaydi, qabul qilinsin.
    @Test
    void acceptsSecretWrappedAcrossLinesLikeOpensslOutput() {
        String wrapped = VALID.substring(0, 20) + "\n" + VALID.substring(20);
        assertDoesNotThrow(() -> initWith(wrapped));
    }

    @Test
    void acceptsSecretWithTrailingCrLfFromCopyPaste() {
        assertDoesNotThrow(() -> initWith(VALID + "\r\n"));
        assertDoesNotThrow(() -> initWith("  " + VALID + " \n"));
    }

    // Tozalash sizib ketgan kalitni "yangi" qilib ko'rsatmasin.
    @Test
    void stillRejectsLeakedDefaultSecretWhenPaddedWithWhitespace() {
        assertThrows(IllegalStateException.class, () -> initWith(COMPROMISED + "\n"));
        assertThrows(IllegalStateException.class,
                () -> initWith(COMPROMISED.substring(0, 10) + "\n" + COMPROMISED.substring(10)));
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
