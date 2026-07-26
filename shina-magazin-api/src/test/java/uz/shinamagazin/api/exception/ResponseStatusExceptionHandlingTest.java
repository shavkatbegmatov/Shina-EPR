package uz.shinamagazin.api.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * `ResponseStatusException` dagi status kodi saqlanishini qulflaydi.
 *
 * <p>Muammo nozik edi: `GlobalExceptionHandler` da `@ExceptionHandler(Exception.class)`
 * catch-all bor. Spring @ControllerAdvice'ni `ResponseStatusExceptionResolver`
 * dan OLDIN ishlatadi, shuning uchun catch-all `ResponseStatusException` ni ham
 * ushlab olib, HAR QANDAY statusni 500 ga aylantirardi.
 *
 * <p>Amalda bu shuni anglatardi: buyurtma endpointidagi rate-limit javobi
 * (429 + "Juda ko'p so'rov") mijozga "Ichki server xatosi" (500) bo'lib borardi.
 * Frontend 429 ni alohida ishlay olmasdi va foydalanuvchi nima bo'lganini
 * tushunmasdi.
 *
 * <p>Test to'liq MVC zanjirini (standalone) ishlatadi — ya'ni handler tanlash
 * TARTIBINI tekshiradi, handler metodini to'g'ridan-to'g'ri chaqirish emas.
 * Faqat metodni chaqirsak, bu xato umuman ko'rinmasdi.
 */
class ResponseStatusExceptionHandlingTest {

    @RestController
    static class ThrowingController {
        @GetMapping("/rate-limited")
        String rateLimited() {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring.");
        }

        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("kutilmagan holat");
        }
    }

    private final MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("429 saqlanadi (ilgari catch-all uni 500 ga aylantirardi)")
    void preservesTooManyRequestsStatus() throws Exception {
        mvc.perform(get("/rate-limited"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("Juda ko'p so'rov")));
    }

    @Test
    @DisplayName("Kutilmagan istisno hamon 500 va tafsilotsiz")
    void unexpectedExceptionsStillReturnGenericServerError() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("kutilmagan holat"))));
    }
}
