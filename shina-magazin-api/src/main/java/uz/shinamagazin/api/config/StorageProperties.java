package uz.shinamagazin.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Fayl (rasm) saqlash sozlamalari (application.yml: `shop.storage.*`).
 *
 * Hozir lokal-fayl tizimi ({@link uz.shinamagazin.api.service.storage.LocalStorageService}).
 * Coolify'da `dir` persistent volume yo'liga (env SHOP_STORAGE_DIR) ko'rsatiladi.
 * Kelajakda S3/MinIO uchun {@link uz.shinamagazin.api.service.storage.StorageService}
 * interfeysiga yangi implementatsiya qo'shiladi (controller/servis o'zgarmaydi).
 */
@Component
@ConfigurationProperties(prefix = "shop.storage")
@Data
public class StorageProperties {

    /** Rasmlar saqlanadigan papka. Coolify: persistent volume yo'li (env SHOP_STORAGE_DIR). */
    private String dir = "./uploads";

    /**
     * imageUrl prefiksi. Default same-origin `/api/uploads` — dev'da vite proxy,
     * prod'da reverse-proxy `/api` ni backendga yo'naltiradi. Backend boshqa domenda
     * bo'lsa to'liq URL bering (env SHOP_STORAGE_PUBLIC_BASE_URL).
     */
    private String publicBaseUrl = "/api/uploads";

    /** Maksimal fayl hajmi (bayt). Default 5 MB. */
    private long maxSizeBytes = 5L * 1024 * 1024;

    /** Ruxsat etilgan MIME turlari. */
    private List<String> allowedContentTypes = List.of(
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"
    );
}
