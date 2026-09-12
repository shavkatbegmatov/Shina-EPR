package uz.shinamagazin.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.shinamagazin.api.dto.response.PublicSettingsResponse;
import uz.shinamagazin.api.entity.AppSetting;
import uz.shinamagazin.api.repository.AppSettingRepository;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Ommaviy sozlamalar ({@code GET /v1/settings/public}, auth'siz) chek va kirim
 * hujjati sarlavhasini beradi: kassirda {@code SETTINGS_VIEW} yo'q, to'liq
 * sozlamalar unga 403 berib, har POS ochilganda "ruxsat yo'q" chiqarardi va
 * chek sarlavhasiz ketardi. Shu bilan birga ommaviy javobga MAXFIY narsa
 * (Telegram chat ID, bot token holati) tushmasligi ham qulflanadi.
 */
class SettingsServicePublicSettingsTest {

    private static AppSetting setting(String key, String value) {
        return AppSetting.builder().settingKey(key).settingValue(value).build();
    }

    @Test
    @DisplayName("chek sarlavhasi ommaviy sozlamalarda bor")
    void publicSettingsCarryReceiptHeader() {
        AppSettingRepository repo = mock(AppSettingRepository.class);
        when(repo.findBySettingKey(anyString())).thenReturn(Optional.empty());
        when(repo.findBySettingKey(SettingsService.RECEIPT_SHOP_NAME_KEY))
                .thenReturn(Optional.of(setting(SettingsService.RECEIPT_SHOP_NAME_KEY, "Protektor")));
        when(repo.findBySettingKey(SettingsService.RECEIPT_SHOP_PHONE_KEY))
                .thenReturn(Optional.of(setting(SettingsService.RECEIPT_SHOP_PHONE_KEY, "+998 90 406 00 36")));
        when(repo.findBySettingKey(SettingsService.RECEIPT_SHOP_ADDRESS_KEY))
                .thenReturn(Optional.of(setting(SettingsService.RECEIPT_SHOP_ADDRESS_KEY, "Toshkent, Chilonzor")));
        when(repo.findBySettingKey(SettingsService.RECEIPT_FOOTER_KEY))
                .thenReturn(Optional.of(setting(SettingsService.RECEIPT_FOOTER_KEY, "Xaridingiz uchun rahmat!")));

        PublicSettingsResponse pub = new SettingsService(repo).getPublicSettings();

        assertThat(pub.getReceiptShopName()).isEqualTo("Protektor");
        assertThat(pub.getReceiptShopPhone()).isEqualTo("+998 90 406 00 36");
        assertThat(pub.getReceiptShopAddress()).isEqualTo("Toshkent, Chilonzor");
        assertThat(pub.getReceiptFooter()).isEqualTo("Xaridingiz uchun rahmat!");
    }

    @Test
    @DisplayName("sozlama kiritilmagan bo'lsa bo'sh qator — null emas (chek shablonи uchun qulay)")
    void missingReceiptSettingsAreEmptyStrings() {
        AppSettingRepository repo = mock(AppSettingRepository.class);
        when(repo.findBySettingKey(anyString())).thenReturn(Optional.empty());

        PublicSettingsResponse pub = new SettingsService(repo).getPublicSettings();

        assertThat(pub.getReceiptShopName()).isEmpty();
        assertThat(pub.getReceiptFooter()).isEmpty();
    }

    @Test
    @DisplayName("ommaviy javobda maxfiy maydonlar yo'q")
    void publicResponseHasNoSecrets() {
        assertThat(Arrays.stream(PublicSettingsResponse.class.getDeclaredFields()).map(Field::getName))
                .as("Telegram chat ID / token holati / qarz muddati faqat SETTINGS_VIEW bilan")
                .doesNotContain("telegramChatId", "telegramConfigured", "telegramEnabled", "debtDueDays");
    }
}
