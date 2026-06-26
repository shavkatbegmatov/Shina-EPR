package uz.shinamagazin.api.service.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Fayl saqlash abstraksiyasi. Hozirgi implementatsiya: lokal-fayl tizimi
 * ({@link LocalStorageService}). Kelajakda S3/MinIO implementatsiyasi shu
 * interfeysni qondiradi — controller/servis kodi o'zgarmaydi.
 */
public interface StorageService {

    /**
     * Faylni saqlaydi va ommaviy URL qaytaradi.
     *
     * @param file      yuklanayotgan fayl
     * @param keyPrefix papka/kategoriya (masalan "products"); null/bo'sh bo'lsa ildizga
     * @return ommaviy URL (masalan {@code /api/uploads/products/<uuid>.jpg})
     */
    String store(MultipartFile file, String keyPrefix);

    /** Ommaviy URL bo'yicha faylni o'chiradi. Lokal bo'lmagan/mavjud bo'lmagan URL — indamaydi. */
    void delete(String publicUrl);
}
