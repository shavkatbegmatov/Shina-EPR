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

    /**
     * Legacy telefon prefikslari real operator bloklariga to'g'ri kelishi
     * mumkin (+998 93 001-00-XX Ucell, +998 90 990-00-XX Beeline). Prefiks
     * bo'yicha o'chirish real belgilar bilan cheklangan bo'lishi shart:
     * Telegram'ga bog'langan mijoz va pasport/bank rekvizitli xodim — real.
     */
    @Test
    void legacyPhonePrefixDeletesAreGuarded() throws IOException {
        String cleanup = read("/db/demo/demo-cleanup.sql");

        assertTrue(cleanup.contains("AND telegram_chat_id IS NULL"));
        assertTrue(cleanup.contains("AND passport_number IS NULL"));
        assertTrue(cleanup.contains("AND bank_account_number IS NULL"));
    }

    @Test
    void customDelimiterAppearsOnlyOnDedicatedLines() throws IOException {
        assertDelimiterPlacement(read("/db/demo/demo-cleanup.sql"));
        assertDelimiterPlacement(read("/db/demo/demo-seed.sql"));
    }

    private void assertDelimiterPlacement(String script) {
        assertTrue(script.lines()
                .filter(line -> line.contains("@@"))
                .allMatch(line -> line.trim().equals("@@")));
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
