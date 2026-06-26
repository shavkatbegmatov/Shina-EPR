package uz.shinamagazin.api.service.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import uz.shinamagazin.api.config.StorageProperties;
import uz.shinamagazin.api.exception.BadRequestException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Lokal-fayl tizimi storage. Fayllar {@code shop.storage.dir} papkasiga saqlanadi
 * va {@code shop.storage.public-base-url} prefiksi bilan ommaviy URL beriladi
 * (WebConfig resource handler {@code /uploads/**} ni shu papkadan xizmat qiladi).
 *
 * Coolify: `dir`ni persistent volume'ga mount qiling — aks holda deploy'da rasmlar yo'qoladi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocalStorageService implements StorageService {

    private final StorageProperties props;

    @Override
    public String store(MultipartFile file, String keyPrefix) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Fayl bo'sh");
        }
        if (file.getSize() > props.getMaxSizeBytes()) {
            throw new BadRequestException("Fayl hajmi katta (maks " + (props.getMaxSizeBytes() / 1024 / 1024) + " MB)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !props.getAllowedContentTypes().contains(contentType)) {
            throw new BadRequestException("Ruxsat etilmagan fayl turi: " + contentType);
        }

        String prefix = (keyPrefix == null || keyPrefix.isBlank())
                ? "" : keyPrefix.replaceAll("[^a-zA-Z0-9_-]", "") + "/";
        String filename = prefix + UUID.randomUUID() + resolveExtension(file.getOriginalFilename(), contentType);

        try {
            Path base = Paths.get(props.getDir()).toAbsolutePath().normalize();
            Path target = base.resolve(filename).normalize();
            // Path-traversal himoyasi
            if (!target.startsWith(base)) {
                throw new BadRequestException("Noto'g'ri fayl yo'li");
            }
            Files.createDirectories(target.getParent());
            file.transferTo(target);
            log.info("Rasm saqlandi: {}", target);
        } catch (IOException e) {
            throw new RuntimeException("Faylni saqlashda xatolik: " + e.getMessage(), e);
        }

        return joinUrl(props.getPublicBaseUrl(), filename);
    }

    @Override
    public void delete(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) return;
        String baseUrl = props.getPublicBaseUrl();
        // Faqat shu storage bergan (lokal) URL'larni o'chiramiz; tashqi URL — indamaymiz
        if (!publicUrl.startsWith(baseUrl)) return;

        String rel = publicUrl.substring(baseUrl.length());
        if (rel.startsWith("/")) rel = rel.substring(1);
        try {
            Path base = Paths.get(props.getDir()).toAbsolutePath().normalize();
            Path target = base.resolve(rel).normalize();
            if (target.startsWith(base)) {
                Files.deleteIfExists(target);
            }
        } catch (IOException e) {
            log.warn("Faylni o'chirishda xatolik ({}): {}", publicUrl, e.getMessage());
        }
    }

    private String resolveExtension(String originalName, String contentType) {
        if (originalName != null && originalName.contains(".")) {
            String ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
            if (ext.matches("\\.[a-z0-9]{1,5}")) return ext;
        }
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "image/avif" -> ".avif";
            default -> ".bin";
        };
    }

    private String joinUrl(String baseUrl, String filename) {
        String b = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return b + "/" + filename;
    }
}
