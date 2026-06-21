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

    private final AppSettingRepository appSettingRepository;

    public SettingsResponse getSettings() {
        return SettingsResponse.builder()
                .debtDueDays(getDebtDueDays())
                .imageFallback(getImageFallback())
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
            AppSetting imgSetting = appSettingRepository.findBySettingKey(IMAGE_FALLBACK_KEY)
                    .orElseGet(() -> AppSetting.builder()
                            .settingKey(IMAGE_FALLBACK_KEY)
                            .description("Storefront fallback for products without image: SVG or PHOTO")
                            .build());
            imgSetting.setSettingValue(normalizeImageFallback(request.getImageFallback()));
            appSettingRepository.save(imgSetting);
        }

        return getSettings();
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
