package uz.shinamagazin.api.service.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import uz.shinamagazin.api.config.StorageProperties;
import uz.shinamagazin.api.exception.BadRequestException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Yuklangan faylning turi va kengaytmasi faqat BAYTLARDAN aniqlanadi.
 *
 * <p>Ilgari kengaytma mijoz bergan fayl nomidan olinardi: {@code Content-Type: image/png}
 * bilan yuborilgan {@code x.html} shu nom bilan saqlanib, {@code /api/uploads/...html}
 * manzilidan HTML sifatida xizmat qilinardi — asosiy domenda saqlanuvchi XSS
 * (tokenlar localStorage'da). Bu testlar o'sha yo'lni yopiq ushlab turadi.
 */
class LocalStorageServiceTest {

    @TempDir
    Path dir;

    private StorageProperties props;
    private LocalStorageService service;

    @BeforeEach
    void setUp() {
        props = new StorageProperties();
        props.setDir(dir.toString());
        props.setPublicBaseUrl("/api/uploads");
        service = new LocalStorageService(props);
    }

    private static byte[] png() {
        byte[] sig = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        byte[] body = new byte[64];
        byte[] all = new byte[sig.length + body.length];
        System.arraycopy(sig, 0, all, 0, sig.length);
        return all;
    }

    private static byte[] jpeg() {
        byte[] all = new byte[64];
        all[0] = (byte) 0xFF;
        all[1] = (byte) 0xD8;
        all[2] = (byte) 0xFF;
        all[3] = (byte) 0xE0;
        return all;
    }

    @Test
    @DisplayName("image/png deb yuborilgan HTML rad etiladi")
    void htmlDeclaredAsImageIsRejected() {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "x.html", "image/png", html);

        assertThatThrownBy(() -> service.store(file, "products"))
                .isInstanceOf(BadRequestException.class);
        assertThat(dir.resolve("products")).doesNotExist();
    }

    @Test
    @DisplayName("Kengaytma fayl nomidan emas, baytlardan olinadi")
    void extensionComesFromBytesNotFromFilename() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "payload.html", "image/png", png());

        String url = service.store(file, "products");

        assertThat(url).startsWith("/api/uploads/products/").endsWith(".png");
        String stored = url.substring("/api/uploads/".length());
        assertThat(Files.exists(dir.resolve(stored))).isTrue();
    }

    @Test
    @DisplayName("Content-Type noto'g'ri e'lon qilingan bo'lsa ham haqiqiy tur saqlanadi")
    void jpegBytesWithPngDeclarationAreStoredAsJpg() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", jpeg());

        String url = service.store(file, "products");

        assertThat(url).endsWith(".jpg");
    }

    @Test
    @DisplayName("Ruxsat etilmagan e'lon qilingan tur (svg) baytlardan oldin rad etiladi")
    void declaredSvgIsRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "a.svg", "image/svg+xml",
                "<svg onload=alert(1)/>".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.store(file, "products"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Hajm chegarasi saqlanadi")
    void tooLargeFileIsRejected() {
        props.setMaxSizeBytes(16);
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", png());

        assertThatThrownBy(() -> service.store(file, "products"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hajmi");
    }

    @Test
    @DisplayName("keyPrefix'dagi yo'l belgilari tozalanadi (path traversal)")
    void keyPrefixIsSanitised() {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", png());

        String url = service.store(file, "../../etc");

        assertThat(url).startsWith("/api/uploads/etc/");
        assertThat(Files.exists(dir.resolve("etc"))).isTrue();
    }
}
