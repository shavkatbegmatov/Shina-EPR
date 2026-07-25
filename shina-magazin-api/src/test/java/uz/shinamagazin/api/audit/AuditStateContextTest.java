package uz.shinamagazin.api.audit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Audit dastlabki-holat kontekstining ikkita muhim xossasini qulflaydi:
 * u tranzaksiyadan uzoq YASHAMAYDI va oqimlar orasida ARALASHMAYDI.
 *
 * Tarixiy muammo: bu holat {@code AuditEntityListener} ichidagi
 * {@code static ConcurrentHashMap} edi. Yozuv har {@code @PostLoad}da
 * qo'shilib, faqat yangilash/o'chirishda o'chirilardi — ya'ni o'qilgan-u
 * yozilmagan har bir entity xotirada abadiy qolardi (eksportda 10 000 ta).
 * Xarita global bo'lgani uchun ikki so'rov bir entity'ni yangilaganda
 * biri baseline'siz qolib, o'zgarish AUDITSIZ o'tib ketardi.
 */
class AuditStateContextTest {

    @AfterEach
    void tearDown() {
        AuditStateContext.clear();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("get() yozuvni o'chirmaydi — bitta tranzaksiyada ikkinchi yangilash ham auditlanadi")
    void getDoesNotConsumeTheEntry() {
        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));

        assertThat(AuditStateContext.get("Product:1")).isNotNull();
        assertThat(AuditStateContext.get("Product:1"))
                .as("ikkinchi o'qish ham baseline qaytarishi kerak")
                .isNotNull();
    }

    @Test
    @DisplayName("Holat oqimlar orasida ko'rinmaydi")
    void stateIsNotVisibleAcrossThreads() throws Exception {
        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));

        Map<String, Object> seenByOtherThread =
                CompletableFuture.supplyAsync(() -> AuditStateContext.get("Product:1")).get();

        assertThat(seenByOtherThread)
                .as("boshqa oqim bu yozuvni ko'rmasligi kerak")
                .isNull();
    }

    @Test
    @DisplayName("Bir oqimdagi tozalash boshqasiga ta'sir qilmaydi")
    void clearingOneThreadDoesNotAffectAnother() throws Exception {
        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));

        CompletableFuture.runAsync(() -> {
            AuditStateContext.put("Product:2", Map.of("name", "Toyo"));
            AuditStateContext.clear();
        }).get();

        assertThat(AuditStateContext.get("Product:1")).isNotNull();
    }

    @Test
    @DisplayName("Tranzaksiya tugagach holat avtomatik bo'shatiladi")
    void stateIsReleasedWhenTransactionCompletes() {
        TransactionSynchronizationManager.initSynchronization();

        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));
        assertThat(AuditStateContext.size()).isEqualTo(1);

        // Spring tranzaksiya yakunida shu callback'larni chaqiradi
        List<TransactionSynchronization> synchronizations =
                TransactionSynchronizationManager.getSynchronizations();
        assertThat(synchronizations)
                .as("put() tranzaksiya tugashiga tozalashni ro'yxatdan o'tkazishi kerak")
                .isNotEmpty();
        synchronizations.forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));

        assertThat(AuditStateContext.size())
                .as("tranzaksiyadan keyin hech narsa qolmasligi kerak")
                .isZero();
    }

    @Test
    @DisplayName("Rollback'da ham holat bo'shatiladi")
    void stateIsReleasedOnRollback() {
        TransactionSynchronizationManager.initSynchronization();
        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));

        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        assertThat(AuditStateContext.size()).isZero();
    }

    @Test
    @DisplayName("Bitta tranzaksiyadagi yozuvlar soni cheklanadi (eksport heap'ni to'ldirmasin)")
    void entryCountIsBounded() {
        for (int i = 0; i < 10_000; i++) {
            AuditStateContext.put("Product:" + i, Map.of("name", "p" + i));
        }

        assertThat(AuditStateContext.size())
                .as("chegaradan oshmasligi kerak")
                .isLessThanOrEqualTo(5_000);
    }

    @Test
    @DisplayName("clear() barcha yozuvlarni bo'shatadi")
    void clearReleasesEverything() {
        AuditStateContext.put("Product:1", Map.of("name", "Michelin"));
        AuditStateContext.put("Product:2", Map.of("name", "Toyo"));

        AuditStateContext.clear();

        assertThat(AuditStateContext.size()).isZero();
        assertThat(AuditStateContext.get("Product:1")).isNull();
    }
}
