package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Excel import natijasi.
 *
 * <p>Import "hammasi yoki hech nima" tamoyilida ishlaydi: bitta qatorda ham
 * xato bo'lsa HECH NIMA yozilmaydi va barcha xatolar qaytariladi. Yarim
 * import qilingan katalog — foydalanuvchi uchun eng yomon holat: qaysi
 * mahsulot tushdi, qaysi biri yo'q — bilib bo'lmaydi.
 *
 * <p>Shu sababli {@code dryRun} va haqiqiy import bir xil tekshiruvdan o'tadi:
 * ko'rib chiqishda xato yo'q bo'lsa, qo'llashda ham bo'lmaydi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductImportResult {

    /** Faylda o'qilgan qatorlar (sarlavhasiz). */
    private int totalRows;
    /** Yangi yaratiladigan/yaratilgan mahsulotlar. */
    private int created;
    /** SKU bo'yicha topilib yangilanadigan/yangilangan mahsulotlar. */
    private int updated;

    /** Xatolar (bo'sh bo'lsa import qo'llanadi). */
    private List<RowError> errors;

    /** true = faqat tekshirildi, baza o'zgarmadi. */
    private boolean dryRun;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        /** Excel'dagi qator raqami (1-dan, sarlavha bilan birga) — foydalanuvchi topa olsin. */
        private int row;
        private String sku;
        private String message;
    }
}
