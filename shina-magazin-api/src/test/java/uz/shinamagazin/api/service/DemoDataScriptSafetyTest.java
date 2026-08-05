package uz.shinamagazin.api.service;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DemoDataScriptSafetyTest {

    @Test
    void cleanupDoesNotUseBroadNotificationDeletes() throws IOException {
        String cleanup = read("/db/demo/demo-cleanup.sql");

        assertFalse(cleanup.contains("DELETE FROM staff_notifications\n@@"));
        assertFalse(cleanup.contains("DELETE FROM customer_notifications\n@@"));
        assertTrue(cleanup.contains("reference_type = 'DEMO_DATA'"));
        assertTrue(cleanup.contains("metadata @> '{\"demo\":true}'::jsonb"));
    }

    @Test
    void seedNeverSelectsRandomRealBusinessRows() throws IOException {
        String seed = read("/db/demo/demo-seed.sql");

        assertFalse(seed.toLowerCase().contains("order by random()"));
        assertTrue(seed.contains("current_setting('protektor.demo_user_id')"));
        assertTrue(seed.contains("WHERE product.sku LIKE 'DEMO-%'"));
    }

    private String read(String path) throws IOException {
        try (var stream = getClass().getResourceAsStream(path)) {
            if (stream == null) {
                throw new IOException("Resource not found: " + path);
            }
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
