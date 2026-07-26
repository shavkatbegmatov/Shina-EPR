package uz.shinamagazin.api.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.ForwardedHeaderFilter;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mijoz IP aniqlanishini qulflaydi — bu rate limit ISHLASHINING sharti.
 *
 * <p>Agar IP mijoz yuborgan sarlavhadan olinsa, hujumchi har so'rovda boshqa
 * qiymat yuborib throttle'ni butunlay chetlab o'tadi: har urinish "yangi IP"
 * bo'lib ko'rinadi va chegara hech qachon ishlamaydi.
 */
class ClientIpTest {

    @Test
    @DisplayName("X-Forwarded-For dagi ENG O'NGDAGI qiymat olinadi (proksi qo'shgani)")
    void prefersRightmostForwardedForEntry() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");                       // Traefik konteyneri
        // Chapdagi 1.2.3.4 — mijoz O'ZI yuborgan (soxta bo'lishi mumkin),
        // o'ngdagi 203.0.113.9 — Traefik qo'shgan haqiqiy manzil.
        request.addHeader("X-Forwarded-For", "1.2.3.4, 203.0.113.9");

        assertThat(ClientIp.of(request)).isEqualTo("203.0.113.9");
    }

    @Test
    @DisplayName("Soxta X-Forwarded-For throttle kalitini o'zgartira olmaydi")
    void spoofedForwardedForCannotChangeTheKey() {
        // Hujumchining haqiqiy manzili bir xil, lekin u har safar boshqa
        // soxta qiymat yuboradi. Kalit o'zgarmasligi kerak.
        String first = ClientIp.of(requestWithForwarded("9.9.9.9, 198.51.100.7"));
        String second = ClientIp.of(requestWithForwarded("8.8.8.8, 198.51.100.7"));
        String third = ClientIp.of(requestWithForwarded("7.7.7.7, 1.1.1.1, 198.51.100.7"));

        assertThat(first).isEqualTo("198.51.100.7");
        assertThat(second).isEqualTo(first);
        assertThat(third).isEqualTo(first);
    }

    @Test
    @DisplayName("Sarlavha bo'lmasa remoteAddr ishlatiladi")
    void fallsBackToRemoteAddr() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.42");

        assertThat(ClientIp.of(request)).isEqualTo("203.0.113.42");
    }

    @Test
    @DisplayName("X-Real-IP zaxira sifatida ishlaydi")
    void usesRealIpHeaderWhenForwardedForAbsent() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");
        request.addHeader("X-Real-IP", "203.0.113.77");

        assertThat(ClientIp.of(request)).isEqualTo("203.0.113.77");
    }

    /**
     * ⚠️ NEGA `forward-headers-strategy: native` KERAK.
     *
     * <p>Bu test taxminni emas, o'lchangan xatti-harakatni yozib qo'yadi.
     * `framework` strategiyasi Spring'ning {@link ForwardedHeaderFilter} ini
     * yoqadi. U forwarded sarlavhalarni ishlatgach ularni O'CHIRIB tashlaydi va
     * `getRemoteAddr()` ni {@code X-Forwarded-For} ning BIRINCHI qiymatiga
     * o'rnatadi — ya'ni MIJOZ yuborgan qiymatga.
     *
     * <p>Amalda bu rate limitni butunlay bekor qiladi: hujumchi har so'rovda
     * boshqa soxta IP yuboradi, har urinish "yangi IP" bo'lib ko'rinadi va
     * chegara hech qachon ishlamaydi.
     *
     * <p>Shuning uchun prod'da Tomcat'ning RemoteIpValve'i ishlatiladi
     * (`native`): u XFF ni O'NGDAN CHAPGA yurib, ishonchli ichki proksilarni
     * o'tkazib yuboradi va birinchi ISHONCHSIZ manzilni oladi — soxta qiymat
     * Traefik qo'shgan haqiqiy manzilning chap tomonida qolib, e'tiborsiz
     * qoldiriladi.
     */
    @Test
    @DisplayName("ForwardedHeaderFilter mijoz yuborgan IP'ni ishlatadi — shuning uchun `native` kerak")
    void forwardedHeaderFilterTrustsClientSuppliedAddress() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/auth/login");
        request.setRemoteAddr("172.18.0.5");
        // "1.2.3.4" — mijoz o'zi yozgan soxta qiymat; "203.0.113.9" — Traefik qo'shgan.
        request.addHeader("X-Forwarded-For", "1.2.3.4, 203.0.113.9");

        AtomicReference<String> seenHeader = new AtomicReference<>();
        AtomicReference<String> resolved = new AtomicReference<>();

        FilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                var wrapped = (jakarta.servlet.http.HttpServletRequest) req;
                seenHeader.set(wrapped.getHeader("X-Forwarded-For"));
                resolved.set(ClientIp.of(wrapped));
            }
        };

        new ForwardedHeaderFilter().doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(seenHeader.get())
                .as("filtr forwarded sarlavhalarni o'chirib tashlaydi")
                .isNull();
        assertThat(resolved.get())
                .as("""
                        Filtr getRemoteAddr() ni mijoz yuborgan qiymatga o'rnatadi.
                        Agar bu o'zgarsa — `native` strategiyasiga bo'lgan ehtiyoj ham
                        qayta ko'rib chiqilsin (application-prod.yml izohiga qarang).""")
                .isEqualTo("1.2.3.4");
    }

    private static MockHttpServletRequest requestWithForwarded(String value) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.18.0.5");
        request.addHeader("X-Forwarded-For", value);
        return request;
    }
}
