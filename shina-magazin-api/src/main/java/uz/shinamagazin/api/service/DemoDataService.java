package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.response.DemoDataStatusResponse;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.UserRepository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DemoDataService {

    static final String DATASET_VERSION = "2.0";
    private static final long ADVISORY_LOCK_KEY = 73_726_845_221L;
    private static final String CLEANUP_SCRIPT = "db/demo/demo-cleanup.sql";
    private static final String SEED_SCRIPT = "db/demo/demo-seed.sql";
    private static final String EXTERNAL_REFERENCES_SQL = """
            WITH demo_products AS (
              SELECT id
                FROM products
               WHERE sku LIKE 'DEMO-%'
                  OR sku IN ('MCH-ENS-1856515','BRD-TUR-2055516','CNT-PC6-2255017',
                             'GDY-EFG-1956015','HNK-VP3-2155516','KMH-ES31-1956515',
                             'YKH-BEGT-2056016','NKN-ND8-2055516','TYO-CAS2-2156016',
                             'SLN-AZE-2055516','MCH-LTC-2356018','BRD-DHP-2355519',
                             'CNT-CLX2-2457016','PIR-SCW-2555518','NKN-OAT-2656517',
                             'TYO-PST-2855020','CNT-VAN2-1957015','BRD-DR660-2056516',
                             'TRI-TR652-2257015','MCH-PR4-1207017','BRD-BT-1805517',
                             'DLP-SS-1606017','PIR-PZ-2454019','MCH-PS4S-2553520',
                             'CNT-SC7-2354018','HNK-ION-2354518','AKS-DMK-2T',
                             'AKS-BKL-KREST','AKS-BOLT-M12')
            ),
            demo_customers AS (
              SELECT id FROM customers
               WHERE notes = '[PROTEKTOR_DEMO]' OR phone LIKE '+9989300100%'
            ),
            demo_suppliers AS (
              SELECT id FROM suppliers
               WHERE notes = '[PROTEKTOR_DEMO]'
                  OR name IN ('Silk Road Tyres MCHJ','Asia Rubber Import',
                              'Premium Wheels Distribution','Kumho Uzbekistan',
                              'Global Tyre Trade')
            )
            SELECT
              (SELECT COUNT(DISTINCT sale.id)
                 FROM sales sale
                 LEFT JOIN sale_items item ON item.sale_id = sale.id
                WHERE sale.invoice_number NOT LIKE 'DEMO-S-%'
                  AND sale.invoice_number NOT LIKE 'DS-%'
                  AND (sale.customer_id IN (SELECT id FROM demo_customers)
                       OR item.product_id IN (SELECT id FROM demo_products)))
              +
              (SELECT COUNT(DISTINCT purchase.id)
                 FROM purchase_orders purchase
                 LEFT JOIN purchase_order_items item ON item.purchase_order_id = purchase.id
                WHERE purchase.order_number NOT LIKE 'DEMO-P-%'
                  AND purchase.order_number NOT LIKE 'DPO-%'
                  AND (purchase.supplier_id IN (SELECT id FROM demo_suppliers)
                       OR item.product_id IN (SELECT id FROM demo_products)))
              +
              (SELECT COUNT(DISTINCT shop.id)
                 FROM shop_orders shop
                 LEFT JOIN shop_order_items item ON item.order_id = shop.id
                WHERE shop.order_no NOT LIKE 'DEMO-W-%'
                  AND shop.order_no NOT LIKE 'DWEB-%'
                  AND (shop.customer_id IN (SELECT id FROM demo_customers)
                       OR item.product_id IN (SELECT id FROM demo_products)))
              +
              (SELECT COUNT(*)
                 FROM payments payment
                WHERE payment.customer_id IN (SELECT id FROM demo_customers)
                  AND payment.notes IS DISTINCT FROM '[PROTEKTOR_DEMO]'
                  AND payment.notes IS DISTINCT FROM '[demo]')
              +
              (SELECT COUNT(*)
                 FROM debts debt
                WHERE debt.customer_id IN (SELECT id FROM demo_customers)
                  AND debt.notes IS DISTINCT FROM '[PROTEKTOR_DEMO]'
                  AND debt.notes IS DISTINCT FROM '[demo]')
              +
              (SELECT COUNT(*)
                 FROM stock_movements movement
                WHERE (movement.product_id IN (SELECT id FROM demo_products)
                       OR movement.supplier_id IN (SELECT id FROM demo_suppliers))
                  AND movement.reference_type IS DISTINCT FROM 'PROTEKTOR_DEMO'
                  AND movement.reference_type IS DISTINCT FROM 'DEMO_SEED'
              )
            """;

    /**
     * One query keeps the status internally consistent and makes the endpoint cheap.
     * Legacy prefixes are included so databases seeded by the former Flyway script
     * can be detected and cleaned from the new UI.
     */
    private static final String STATUS_SQL = """
            SELECT
              (SELECT COUNT(*) FROM products
                 WHERE sku LIKE 'DEMO-%'
                    OR sku IN ('MCH-ENS-1856515','BRD-TUR-2055516','CNT-PC6-2255017',
                               'GDY-EFG-1956015','HNK-VP3-2155516','KMH-ES31-1956515',
                               'YKH-BEGT-2056016','NKN-ND8-2055516','TYO-CAS2-2156016',
                               'SLN-AZE-2055516','MCH-LTC-2356018','BRD-DHP-2355519',
                               'CNT-CLX2-2457016','PIR-SCW-2555518','NKN-OAT-2656517',
                               'TYO-PST-2855020','CNT-VAN2-1957015','BRD-DR660-2056516',
                               'TRI-TR652-2257015','MCH-PR4-1207017','BRD-BT-1805517',
                               'DLP-SS-1606017','PIR-PZ-2454019','MCH-PS4S-2553520',
                               'CNT-SC7-2354018','HNK-ION-2354518','AKS-DMK-2T',
                               'AKS-BKL-KREST','AKS-BOLT-M12')) AS products,
              (SELECT COUNT(*) FROM customers
                 WHERE notes = '[PROTEKTOR_DEMO]' OR phone LIKE '+9989300100%') AS customers,
              (SELECT COUNT(*) FROM suppliers
                 WHERE notes = '[PROTEKTOR_DEMO]'
                    OR name IN ('Silk Road Tyres MCHJ','Asia Rubber Import',
                                'Premium Wheels Distribution','Kumho Uzbekistan',
                                'Global Tyre Trade')) AS suppliers,
              (SELECT COUNT(*) FROM employees
                 WHERE phone LIKE '+9980002%' OR phone LIKE '+9989099000%') AS employees,
              (SELECT COUNT(*) FROM sales
                 WHERE invoice_number LIKE 'DEMO-S-%' OR invoice_number LIKE 'DS-%') AS sales,
              (SELECT COUNT(*) FROM purchase_orders
                 WHERE order_number LIKE 'DEMO-P-%' OR order_number LIKE 'DPO-%') AS purchases,
              (SELECT COUNT(*) FROM shop_orders
                 WHERE order_no LIKE 'DEMO-W-%' OR order_no LIKE 'DWEB-%') AS shop_orders,
              (SELECT COUNT(*) FROM expenses
                 WHERE description LIKE '[PROTEKTOR_DEMO]%') AS expenses,
              (SELECT setting_value FROM app_settings
                 WHERE setting_key = 'DEMO_DATA_GENERATED_AT') AS generated_at,
              (SELECT setting_value FROM app_settings
                 WHERE setting_key = 'DEMO_DATA_VERSION') AS dataset_version,
              EXISTS(SELECT 1 FROM app_settings WHERE setting_key = 'DEMO_SEED_VERSION') AS legacy_marker
            """;

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final DemoDataScriptRunner scriptRunner;

    @Transactional(readOnly = true)
    public DemoDataStatusResponse getStatus() {
        return jdbcTemplate.queryForObject(STATUS_SQL, (rs, rowNum) -> mapStatus(rs));
    }

    /**
     * Cleanup and seed are deliberately one transaction: if generation fails,
     * the previous complete demo dataset remains available instead of a half-empty state.
     */
    @Transactional
    public DemoDataStatusResponse generate(String username) {
        User actor = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        acquireDatabaseLock();
        jdbcTemplate.queryForObject(
                "SELECT set_config('protektor.demo_user_id', ?, true)",
                String.class,
                actor.getId().toString());

        ensureNoExternalReferences();
        scriptRunner.execute(CLEANUP_SCRIPT);
        scriptRunner.execute(SEED_SCRIPT);
        return getStatus();
    }

    @Transactional
    public DemoDataStatusResponse remove() {
        acquireDatabaseLock();
        ensureNoExternalReferences();
        scriptRunner.execute(CLEANUP_SCRIPT);
        return getStatus();
    }

    private void acquireDatabaseLock() {
        jdbcTemplate.query(
                "SELECT pg_advisory_xact_lock(?)",
                rs -> { },
                ADVISORY_LOCK_KEY);
    }

    private void ensureNoExternalReferences() {
        Integer referenceCount = jdbcTemplate.queryForObject(EXTERNAL_REFERENCES_SQL, Integer.class);
        if (referenceCount != null && referenceCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Demo obyektlariga bog'langan " + referenceCount
                            + " ta oddiy hujjat yoki ombor harakati mavjud. "
                            + "Real hujjatlar xavfsizligi uchun demo o'chirilmadi.");
        }
    }

    private DemoDataStatusResponse mapStatus(ResultSet rs) throws SQLException {
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("products", rs.getInt("products"));
        counts.put("customers", rs.getInt("customers"));
        counts.put("suppliers", rs.getInt("suppliers"));
        counts.put("employees", rs.getInt("employees"));
        counts.put("sales", rs.getInt("sales"));
        counts.put("purchases", rs.getInt("purchases"));
        counts.put("shopOrders", rs.getInt("shop_orders"));
        counts.put("expenses", rs.getInt("expenses"));

        int total = counts.values().stream().mapToInt(Integer::intValue).sum();
        boolean active = total > 0 || rs.getBoolean("legacy_marker");

        String version = rs.getString("dataset_version");
        return DemoDataStatusResponse.builder()
                .active(active)
                .datasetVersion(version != null ? version : (active ? "legacy" : DATASET_VERSION))
                .generatedAt(parseDateTime(rs.getString("generated_at")))
                .totalRecords(total)
                .counts(counts)
                .build();
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
