package uz.shinamagazin.api.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Hujjat raqamlarini (hisob-faktura, xarid, qaytarish) ATOMIK beradi.
 *
 * <p>Ilgari har bir servis o'zi "MAX(...) + 1" qilardi:
 * <pre>
 *     Integer max = saleRepository.findMaxInvoiceNumber(prefix);
 *     int next = (max != null ? max : 0) + 1;
 * </pre>
 * READ COMMITTED (Postgres default) ostida ikki kassir bir vaqtda savdo qilsa
 * ikkalasi ham bir xil MAX o'qib bir xil raqam yasardi. Ustunlar UNIQUE, ya'ni
 * yutqazgan tranzaksiya {@code DataIntegrityViolationException} olib, savdo
 * butunlay yo'qolardi. Ikkita POS terminali shu xatoni chiqarish uchun yetarli.
 *
 * <p>Endi raqam {@code document_sequences} jadvalidan olinadi:
 * {@code INSERT ... ON CONFLICT DO UPDATE} qator darajasida qulf oladi, shuning
 * uchun ikkinchi tranzaksiya birinchisi tugaguncha kutadi va boshqa qiymat oladi.
 *
 * <p>Raqam JORIY tranzaksiyada olinadi (yangi tranzaksiya ochilmaydi): savdo
 * bekor bo'lsa raqam ham qaytariladi, ya'ni raqamlashda bo'shliq qolmaydi.
 * Buning evaziga qulf tranzaksiya oxirigacha ushlanadi — savdo yaratish qisqa
 * amal bo'lgani uchun bu maqbul.
 *
 * <p><b>Eslatma:</b> {@code ON CONFLICT} — PostgreSQL sintaksisi (prod DB shu).
 */
@Service
@RequiredArgsConstructor
public class DocumentNumberService {

    private static final DateTimeFormatter INVOICE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private static final String PURCHASE_ORDER_KEY = "PO-";
    private static final String PURCHASE_RETURN_KEY = "RT-";
    /** Savdo qaytarish — ta'minotchiga qaytarishdan (RT-) farqlanadi. */
    private static final String SALE_RETURN_KEY = "SR-";

    /**
     * Atomik "oshir va qaytar".
     *
     * <p>Ikki bosqich: upsert qator qulfini oladi (tranzaksiya oxirigacha ushlanadi),
     * keyingi SELECT esa shu tranzaksiyaning o'z qiymatini o'qiydi. Bu yerda
     * {@code RETURNING} ishlatilmaydi — Hibernate native DML uchun uni ishonchli
     * qaytarmaydi.
     */
    private static final String UPSERT_SQL = """
            INSERT INTO document_sequences (seq_key, next_value, updated_at)
            VALUES (:key, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (seq_key) DO UPDATE
               SET next_value = document_sequences.next_value + 1,
                   updated_at = CURRENT_TIMESTAMP
            """;

    private static final String SELECT_SQL =
            "SELECT next_value FROM document_sequences WHERE seq_key = :key";

    @PersistenceContext
    private EntityManager entityManager;

    /** Hisob-faktura raqami: {@code INV<yyyyMMdd><0001>} — hisoblagich har kuni yangidan. */
    @Transactional(propagation = Propagation.MANDATORY)
    public String nextInvoiceNumber() {
        String prefix = "INV" + LocalDate.now().format(INVOICE_DATE);
        return prefix + String.format("%04d", next(prefix));
    }

    /** Xarid buyurtmasi raqami: {@code PO-000001}. */
    @Transactional(propagation = Propagation.MANDATORY)
    public String nextPurchaseOrderNumber() {
        return String.format("%s%06d", PURCHASE_ORDER_KEY, next(PURCHASE_ORDER_KEY));
    }

    /** Xarid qaytarish raqami: {@code RT-000001}. */
    @Transactional(propagation = Propagation.MANDATORY)
    public String nextPurchaseReturnNumber() {
        return String.format("%s%06d", PURCHASE_RETURN_KEY, next(PURCHASE_RETURN_KEY));
    }

    /** Savdo qaytarish raqami: {@code SR-000001}. */
    @Transactional(propagation = Propagation.MANDATORY)
    public String nextSaleReturnNumber() {
        return String.format("%s%06d", SALE_RETURN_KEY, next(SALE_RETURN_KEY));
    }

    private long next(String key) {
        entityManager.createNativeQuery(UPSERT_SQL)
                .setParameter("key", key)
                .executeUpdate();

        Number value = (Number) entityManager.createNativeQuery(SELECT_SQL)
                .setParameter("key", key)
                .getSingleResult();

        return value.longValue();
    }
}
