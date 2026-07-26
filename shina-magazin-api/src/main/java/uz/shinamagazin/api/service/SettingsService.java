package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.SettingsUpdateRequest;
import uz.shinamagazin.api.dto.response.PublicSettingsResponse;
import uz.shinamagazin.api.dto.response.SettingsResponse;
import uz.shinamagazin.api.entity.AppSetting;
import uz.shinamagazin.api.repository.AppSettingRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    public static final String DEBT_DUE_DAYS_KEY = "DEBT_DUE_DAYS";
    public static final int DEFAULT_DEBT_DUE_DAYS = 30;
    public static final String IMAGE_FALLBACK_KEY = "STOREFRONT_IMAGE_FALLBACK";
    public static final String DEFAULT_IMAGE_FALLBACK = "SVG";

    // Chek sarlavhasi/oxiri — mijozga beriladigan qog'ozdagi do'kon ma'lumotlari
    public static final String RECEIPT_SHOP_NAME_KEY = "RECEIPT_SHOP_NAME";
    public static final String RECEIPT_SHOP_PHONE_KEY = "RECEIPT_SHOP_PHONE";
    public static final String RECEIPT_SHOP_ADDRESS_KEY = "RECEIPT_SHOP_ADDRESS";
    public static final String RECEIPT_FOOTER_KEY = "RECEIPT_FOOTER";

    private final AppSettingRepository appSettingRepository;

    public SettingsResponse getSettings() {
        return SettingsResponse.builder()
                .debtDueDays(getDebtDueDays())
                .imageFallback(getImageFallback())
                .receiptShopName(getText(RECEIPT_SHOP_NAME_KEY))
                .receiptShopPhone(getText(RECEIPT_SHOP_PHONE_KEY))
                .receiptShopAddress(getText(RECEIPT_SHOP_ADDRESS_KEY))
                .receiptFooter(getText(RECEIPT_FOOTER_KEY))
                .build();
    }

    /** Storefront (guest) uchun ommaviy sozlamalar — auth talab qilmaydi. */
    public PublicSettingsResponse getPublicSettings() {
        return PublicSettingsResponse.builder()
                .imageFallback(getImageFallback())
                .build();
    }

    public int getDebtDueDays() {
        return appSettingRepository.findBySettingKey(DEBT_DUE_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(this::parsePositiveInt)
                .orElse(DEFAULT_DEBT_DUE_DAYS);
    }

    /** Rasmsiz mahsulot ko'rinishi: "SVG" yoki "PHOTO" (default SVG). */
    public String getImageFallback() {
        return appSettingRepository.findBySettingKey(IMAGE_FALLBACK_KEY)
                .map(AppSetting::getSettingValue)
                .map(this::normalizeImageFallback)
                .orElse(DEFAULT_IMAGE_FALLBACK);
    }

    @Transactional
    public SettingsResponse updateSettings(SettingsUpdateRequest request) {
        AppSetting debtSetting = appSettingRepository.findBySettingKey(DEBT_DUE_DAYS_KEY)
                .orElseGet(() -> AppSetting.builder()
                        .settingKey(DEBT_DUE_DAYS_KEY)
                        .description("Default debt due date in days")
                        .build());
        debtSetting.setSettingValue(String.valueOf(request.getDebtDueDays()));
        appSettingRepository.save(debtSetting);

        // Storefront rasm fallback (ixtiyoriy — faqat berilgan bo'lsa yangilanadi)
        if (request.getImageFallback() != null && !request.getImageFallback().isBlank()) {
            saveText(IMAGE_FALLBACK_KEY,
                    normalizeImageFallback(request.getImageFallback()),
                    "Storefront fallback for products without image: SVG or PHOTO");
        }

        // Chek sozlamalari — null bo'lsa tegilmaydi, bo'sh satr esa "tozalash"
        // degani (masalan manzilni chekdan olib tashlash).
        saveTextIfPresent(request.getReceiptShopName(), RECEIPT_SHOP_NAME_KEY, "Chek sarlavhasidagi do'kon nomi");
        saveTextIfPresent(request.getReceiptShopPhone(), RECEIPT_SHOP_PHONE_KEY, "Chekdagi telefon raqam");
        saveTextIfPresent(request.getReceiptShopAddress(), RECEIPT_SHOP_ADDRESS_KEY, "Chekdagi manzil");
        saveTextIfPresent(request.getReceiptFooter(), RECEIPT_FOOTER_KEY, "Chek oxiridagi matn");

        return getSettings();
    }

    /** Matnli sozlama (yo'q bo'lsa bo'sh satr — chekda tegishli qator chiqmaydi). */
    private String getText(String key) {
        return appSettingRepository.findBySettingKey(key)
                .map(AppSetting::getSettingValue)
                .orElse("");
    }

    private void saveTextIfPresent(String value, String key, String description) {
        if (value != null) {
            saveText(key, value.trim(), description);
        }
    }

    private void saveText(String key, String value, String description) {
        AppSetting setting = appSettingRepository.findBySettingKey(key)
                .orElseGet(() -> AppSetting.builder()
                        .settingKey(key)
                        .description(description)
                        .build());
        setting.setSettingValue(value);
        appSettingRepository.save(setting);
    }

    private int parsePositiveInt(String value) {
        try {
            int parsed = Integer.parseInt(value);
            return parsed > 0 ? parsed : DEFAULT_DEBT_DUE_DAYS;
        } catch (NumberFormatException ex) {
            log.warn("Invalid debt due days setting value: '{}'", value);
            return DEFAULT_DEBT_DUE_DAYS;
        }
    }

    private String normalizeImageFallback(String value) {
        return "PHOTO".equalsIgnoreCase(value) ? "PHOTO" : "SVG";
    }
}
