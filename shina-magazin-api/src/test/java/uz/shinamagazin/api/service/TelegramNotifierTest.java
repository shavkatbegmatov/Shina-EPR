package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.shinamagazin.api.exception.BadRequestException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Telegram transporti.
 *
 * <p>Asosiy talab: xabarnoma YORDAMCHI funksiya. Telegram ishlamay qolsa,
 * tokeni bo'lmasa yoki chat ID kiritilmagan bo'lsa — savdo rasmiylashtirish
 * to'xtab qolmasligi kerak. Shu sababli {@code send} hech qachon istisno
 * otmaydi, {@code sendTestMessage} esa aksincha — u sozlashni tekshirish
 * uchun va jim qolishi mumkin emas.
 */
class TelegramNotifierTest {

    /**
     * Yopiq lokal port — ulanish DARHOL rad etiladi.
     *
     * <p>Haqiqiy {@code api.telegram.org} ga chiqish testni tarmoqqa bog'lab
     * qo'yardi: CI'da tashqi tarmoq bo'lmasa timeout kutilib, sekin va
     * beqaror bo'lardi.
     */
    private static final String UNREACHABLE = "http://127.0.0.1:1/bot";

    private SettingsService settings;

    @BeforeEach
    void setUp() {
        settings = mock(SettingsService.class);
        when(settings.isTelegramEnabled()).thenReturn(true);
        when(settings.getTelegramChatId()).thenReturn("12345");
    }

    // ─── send: hech qachon yiqilmaydi ───

    @Test
    @DisplayName("Tokensiz jimgina o'tkazib yuboriladi")
    void withoutTokenDoesNothing() {
        TelegramNotifier notifier = new TelegramNotifier("", UNREACHABLE, settings);

        assertThat(notifier.isConfigured()).isFalse();
        assertThatCode(() -> notifier.send("test")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Bo'sh xabar yuborilmaydi")
    void blankMessageIsSkipped() {
        TelegramNotifier notifier = new TelegramNotifier("token", UNREACHABLE, settings);

        assertThatCode(() -> {
            notifier.send(null);
            notifier.send("   ");
        }).doesNotThrowAnyException();
    }

    // Eng muhimi: yaroqsiz token bilan Telegram xato qaytaradi. Agar bu
    // istisno chaqiruvchiga chiqsa, savdo yaratish yiqilardi.
    @Test
    @DisplayName("Telegram xatosi chaqiruvchiga chiqmaydi")
    void deliveryFailureIsSwallowed() {
        TelegramNotifier notifier = new TelegramNotifier("yaroqsiz-token", UNREACHABLE, settings);

        assertThatCode(() -> notifier.send("test")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("O'chirilgan bo'lsa yuborilmaydi")
    void disabledSkipsSend() {
        when(settings.isTelegramEnabled()).thenReturn(false);
        TelegramNotifier notifier = new TelegramNotifier("token", UNREACHABLE, settings);

        assertThatCode(() -> notifier.send("test")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Chat ID kiritilmagan bo'lsa yuborilmaydi")
    void missingChatIdSkipsSend() {
        when(settings.getTelegramChatId()).thenReturn("");
        TelegramNotifier notifier = new TelegramNotifier("token", UNREACHABLE, settings);

        assertThatCode(() -> notifier.send("test")).doesNotThrowAnyException();
    }

    // ─── sendTestMessage: aksincha, xatoni KO'RSATADI ───

    @Test
    @DisplayName("Sinov xabari tokensiz aniq xato beradi")
    void testMessageWithoutTokenExplains() {
        TelegramNotifier notifier = new TelegramNotifier("", UNREACHABLE, settings);

        assertThatThrownBy(() -> notifier.sendTestMessage("12345"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("TELEGRAM_BOT_TOKEN");
    }

    @Test
    @DisplayName("Sinov xabari chat IDsiz aniq xato beradi")
    void testMessageWithoutChatIdExplains() {
        TelegramNotifier notifier = new TelegramNotifier("token", UNREACHABLE, settings);

        assertThatThrownBy(() -> notifier.sendTestMessage("  "))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chat ID");
    }

    // "Yuborildi" deb yozib, aslida hech narsa yetib bormasligi — sozlashning
    // eng ko'p uchraydigan tuzog'i. Sinov tugmasi buni ochib berishi kerak.
    @Test
    @DisplayName("Sinov xabari yetib bormasa xatolik qaytariladi")
    void testMessageReportsDeliveryFailure() {
        TelegramNotifier notifier = new TelegramNotifier("yaroqsiz-token", UNREACHABLE, settings);

        assertThatThrownBy(() -> notifier.sendTestMessage("12345"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Telegram");
    }
}
