package uz.shinamagazin.api.exception;

import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spring MVC'ning standart mijoz xatolari to'g'ri status bilan qaytishi.
 *
 * <p>Ilgari bularning hammasi {@code Exception} catch-all'ga tushib 500 bo'lardi:
 * jonli serverda mavjud bo'lmagan {@code /actuator/env} ham "Ichki server xatosi"
 * qaytarardi, 6 MB dan katta rasm ham. Monitoring uchun soxta 5xx signal edi.
 */
class GlobalExceptionHandlerClientErrorsTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Mavjud bo'lmagan manzil 404")
    void missingResourceIs404() {
        var response = handler.handleNotFound(new NoResourceFoundException(HttpMethod.GET, "/actuator/env"));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    @DisplayName("Qo'llab-quvvatlanmagan HTTP usuli 405")
    void methodNotAllowedIs405() {
        var response = handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("DELETE"));

        assertThat(response.getStatusCode().value()).isEqualTo(405);
    }

    @Test
    @DisplayName("Content-Type mos kelmasa 415")
    void unsupportedMediaTypeIs415() {
        var response = handler.handleMediaTypeNotSupported(new HttpMediaTypeNotSupportedException("text/plain"));

        assertThat(response.getStatusCode().value()).isEqualTo(415);
    }

    @Test
    @DisplayName("Majburiy parametr yo'q — 400 va parametr nomi")
    void missingParameterIs400() {
        var response = handler.handleMissingParameter(
                new MissingServletRequestParameterException("refreshToken", "String"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("refreshToken");
    }

    @Test
    @DisplayName("Parametr turi mos kelmasa (GET /products/abc) 400")
    void typeMismatchIs400() {
        var response = handler.handleTypeMismatch(
                new MethodArgumentTypeMismatchException("abc", Long.class, "id", null, null));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).contains("id");
    }

    @Test
    @DisplayName("Fayl hajmi chegaradan oshsa 413")
    void uploadTooLargeIs413() {
        var response = handler.handleUploadTooLarge(new MaxUploadSizeExceededException(6L * 1024 * 1024));

        assertThat(response.getStatusCode().value()).isEqualTo(413);
    }

    @Test
    @DisplayName("Validated parametr xatosi 400")
    void constraintViolationIs400() {
        var response = handler.handleConstraintViolation(new ConstraintViolationException(Set.of()));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }
}
