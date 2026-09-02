package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.SettingsUpdateRequest;
import uz.shinamagazin.api.dto.response.PublicSettingsResponse;
import uz.shinamagazin.api.dto.response.SettingsResponse;
import uz.shinamagazin.api.entity.AppSetting;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.repository.AppSettingRepository;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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

    // Telegram xabarnomalari. Bot TOKENI bu yerda EMAS — u muhit
    // o'zgaruvchisidan olinadi, chunki app_settings sozlamalar API'sida
    // ko'rinadi va audit jurnaliga tushadi (qarang: TelegramNotifier).
    public static final String TELEGRAM_ENABLED_KEY = "TELEGRAM_ENABLED";
    public static final String TELEGRAM_CHAT_ID_KEY = "TELEGRAM_CHAT_ID";
    public static final String TELEGRAM_EVENTS_KEY = "TELEGRAM_EVENTS";
    /** Sukut: harakat talab qiladigan voqealar. To'lov/yangi mijoz — shovqin. */
    public static final String DEFAULT_TELEGRAM_EVENTS = "ORDER,WARNING";

    // Telegram orqali mijozning o'zi ro'yxatdan o'tishi. Bot USERNAME'i maxfiy
    // emas (uni har bir foydalanuvchi baribir ko'radi), shuning uchun tokendan
    // farqli o'laroq sozlamalarda saqlanadi va storefront'ga ochiq beriladi.
    public static final String TELEGRAM_REGISTRATION_ENABLED_KEY = "TELEGRAM_REGISTRATION_ENABLED";
    public static final String TELEGRAM_BOT_USERNAME_KEY = "TELEGRAM_BOT_USERNAME";

    // Vitrina yetkazib berish narxi. Ilgari ShopOrderService'da qattiq yozilgan edi
    // (30 000 / 1 000 000) — o'zgartirish uchun deploy kerak bo'lardi, holbuki
    // app_settings jadvali va bu servis aynan shunday sozlamalar uchun bor.
    public static final String SHOP_DELIVERY_FEE_KEY = "SHOP_DELIVERY_FEE";
    public static final long DEFAULT_SHOP_DELIVERY_FEE = 30_000L;
    public static final String SHOP_FREE_DELIVERY_THRESHOLD_KEY = "SHOP_FREE_DELIVERY_THRESHOLD";
    public static final long DEFAULT_SHOP_FREE_DELIVERY_THRESHOLD = 1_000_000L;

    private final AppSettingRepository appSettingRepository;

    /**
     * Bot tokeni O'RNATILGANMI — tokenning o'zi emas.
     *
     * <p>{@code TelegramNotifier} ni in'ektsiya qilish aylanma bog'liqlik
     * berardi (u SettingsService'ga tayanadi), shuning uchun bu yerda faqat
     * xususiyatning bo'sh-bo'shmasligi o'qiladi.
     */
    @Value("${telegram.bot-token:}")
    private String telegramBotToken;

    public SettingsResponse getSettings() {
        return SettingsResponse.builder()
                .debtDueDays(getDebtDueDays())
                .imageFallback(getImageFallback())
                .receiptShopName(getText(RECEIPT_SHOP_NAME_KEY))
                .receiptShopPhone(getText(RECEIPT_SHOP_PHONE_KEY))
                .receiptShopAddress(getText(RECEIPT_SHOP_ADDRESS_KEY))
                .receiptFooter(getText(RECEIPT_FOOTER_KEY))
                .telegramEnabled(isTelegramEnabled())
                .telegramChatId(getTelegramChatId())
                .telegramEvents(getText(TELEGRAM_EVENTS_KEY).isBlank()
                        ? DEFAULT_TELEGRAM_EVENTS
                        : getText(TELEGRAM_EVENTS_KEY))
                .telegramConfigured(telegramBotToken != null && !telegramBotToken.isBlank())
                .telegramRegistrationEnabled(isTelegramRegistrationEnabled())
                .telegramBotUsername(getTelegramBotUsername())
                .deliveryFee(getDeliveryFee())
                .freeDeliveryThreshold(getFreeDeliveryThreshold())
                .build();
    }

    /** Vitrina yetkazib berish narxi (so'm). */
    public long getDeliveryFee() {
        return getLong(SHOP_DELIVERY_FEE_KEY, DEFAULT_SHOP_DELIVERY_FEE);
    }

    /** Shu summadan boshlab yetkazib berish bepul (so'm). */
    public long getFreeDeliveryThreshold() {
        return getLong(SHOP_FREE_DELIVERY_THRESHOLD_KEY, DEFAULT_SHOP_FREE_DELIVERY_THRESHOLD);
    }

    private long getLong(String key, long defaultValue) {
        return appSettingRepository.findBySettingKey(key)
                .map(AppSetting::getSettingValue)
                .map(value -> {
                    try {
                        long parsed = Long.parseLong(value.trim());
                        return parsed >= 0 ? parsed : defaultValue;
                    } catch (NumberFormatException e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    /**
     * Storefront (guest) uchun ommaviy sozlamalar — auth talab qilmaydi.
     *
     * <p>Telegram ro'yxatdan o'tish shu yerda: "ro'yxatdan o'tish" tugmasini
     * hali kirmagan mehmon ko'rishi kerak. Bot username maxfiy emas, token esa
     * bu javobga HECH QACHON tushmaydi.
     */
    public PublicSettingsResponse getPublicSettings() {
        String botUsername = getTelegramBotUsername();
        return PublicSettingsResponse.builder()
                .imageFallback(getImageFallback())
                // Bot nomi bo'lmasa havola yasab bo'lmaydi — tugmani
                // ko'rsatishning ma'nosi yo'q, u faqat 404'ga olib borardi.
                .telegramRegistrationEnabled(isTelegramRegistrationEnabled() && !botUsername.isBlank())
                .telegramBotUsername(botUsername)
                .deliveryFee(getDeliveryFee())
                .freeDeliveryThreshold(getFreeDeliveryThreshold())
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

        // Telegram — null bo'lsa tegilmaydi
        if (request.getTelegramEnabled() != null) {
            saveText(TELEGRAM_ENABLED_KEY, String.valueOf(request.getTelegramEnabled()),
                    "Telegram xabarnomalari yoqilganmi");
        }
        saveTextIfPresent(request.getTelegramChatId(), TELEGRAM_CHAT_ID_KEY,
                "Xabar yuboriladigan Telegram chat ID");
        if (request.getTelegramEvents() != null) {
            saveText(TELEGRAM_EVENTS_KEY, normalizeEventTypes(request.getTelegramEvents()),
                    "Telegramga uzatiladigan bildirishnoma turlari");
        }
        if (request.getTelegramRegistrationEnabled() != null) {
            saveText(TELEGRAM_REGISTRATION_ENABLED_KEY,
                    String.valueOf(request.getTelegramRegistrationEnabled()),
                    "Mijozlar Telegram bot orqali o'zi ro'yxatdan o'ta oladimi");
        }
        if (request.getTelegramBotUsername() != null) {
            saveText(TELEGRAM_BOT_USERNAME_KEY,
                    normalizeBotUsername(request.getTelegramBotUsername()),
                    "Bot username (@ belgisisiz) — t.me havolasi uchun");
        }

        // Vitrina yetkazib berish — null bo'lsa tegilmaydi
        if (request.getDeliveryFee() != null) {
            saveText(SHOP_DELIVERY_FEE_KEY, String.valueOf(request.getDeliveryFee()),
                    "Vitrina yetkazib berish narxi (so'm)");
        }
        if (request.getFreeDeliveryThreshold() != null) {
            saveText(SHOP_FREE_DELIVERY_THRESHOLD_KEY, String.valueOf(request.getFreeDeliveryThreshold()),
                    "Shu summadan boshlab yetkazib berish bepul (so'm)");
        }

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

    // ─── Telegram ───

    @Transactional(readOnly = true)
    public boolean isTelegramEnabled() {
        return "true".equalsIgnoreCase(getText(TELEGRAM_ENABLED_KEY));
    }

    @Transactional(readOnly = true)
    public String getTelegramChatId() {
        return getText(TELEGRAM_CHAT_ID_KEY).trim();
    }

    /** Mijozlar bot orqali o'zi ro'yxatdan o'ta oladimi (sukut: yo'q). */
    @Transactional(readOnly = true)
    public boolean isTelegramRegistrationEnabled() {
        return "true".equalsIgnoreCase(getText(TELEGRAM_REGISTRATION_ENABLED_KEY));
    }

    /** Bot username, {@code @} belgisisiz. Yo'q bo'lsa bo'sh satr. */
    @Transactional(readOnly = true)
    public String getTelegramBotUsername() {
        return normalizeBotUsername(getText(TELEGRAM_BOT_USERNAME_KEY));
    }

    /**
     * Foydalanuvchi {@code @shina_bot}, {@code https://t.me/shina_bot} yoki
     * shunchaki {@code shina_bot} deb yozishi mumkin — hammasidan bir xil
     * natija chiqadi. Aks holda havola {@code t.me/@shina_bot} bo'lib,
     * ishlamasdi.
     */
    private String normalizeBotUsername(String raw) {
        if (raw == null) {
            return "";
        }
        String value = raw.trim();
        int slash = value.lastIndexOf('/');
        if (slash >= 0) {
            value = value.substring(slash + 1);
        }
        if (value.startsWith("@")) {
            value = value.substring(1);
        }
        return value.trim();
    }

    /**
     * Telegramga uzatiladigan bildirishnoma turlari.
     *
     * <p>Noma'lum nom JIMGINA tashlab yuboriladi: enum'dan tur olib
     * tashlansa, sozlama butunlay ishlamay qolmasligi kerak.
     */
    @Transactional(readOnly = true)
    public Set<StaffNotificationType> getTelegramEventTypes() {
        String raw = getText(TELEGRAM_EVENTS_KEY);
        if (raw.isBlank()) {
            raw = DEFAULT_TELEGRAM_EVENTS;
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(this::parseNotificationType)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(StaffNotificationType.class)));
    }

    /**
     * Faqat haqiqiy enum nomlarini saqlaydi.
     *
     * <p>Aks holda xato yozilgan tur bazada qolib, sozlama ishlayotgandek
     * ko'rinardi-yu, hech qachon mos kelmasdi.
     */
    private String normalizeEventTypes(String raw) {
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(this::parseNotificationType)
                .filter(Objects::nonNull)
                .map(Enum::name)
                .distinct()
                .collect(Collectors.joining(","));
    }

    private StaffNotificationType parseNotificationType(String name) {
        try {
            return StaffNotificationType.valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Noma'lum Telegram voqea turi: '{}'", name);
            return null;
        }
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
