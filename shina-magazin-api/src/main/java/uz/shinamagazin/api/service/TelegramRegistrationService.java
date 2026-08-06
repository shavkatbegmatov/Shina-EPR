package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.telegram.BotReply;
import uz.shinamagazin.api.dto.telegram.TelegramSender;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.enums.CustomerType;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.security.SimpleRateLimiter;
import uz.shinamagazin.api.util.PhoneNumberUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import static uz.shinamagazin.api.service.TelegramApiClient.escapeHtml;

/**
 * Mijozning Telegram bot orqali O'ZI ro'yxatdan o'tishi.
 *
 * <h3>Nega aynan "kontaktni ulashish"</h3>
 *
 * <p>Bu tizimda mijoz TELEFON RAQAMI bilan aniqlanadi: {@code customers.phone}
 * — NOT NULL UNIQUE, portal login = telefon + PIN, savdo va qarzlar shu raqamga
 * bog'lanadi. Telegram Login Widget esa raqamni BERMAYDI (faqat ID va ism),
 * ya'ni undan foydali mijoz yozuvi yaratib bo'lmaydi. Botdagi
 * {@code request_contact} tugmasi bosilganda raqamni Telegramning O'ZI
 * yuboradi — bu SMS kodi bilan bir xil darajadagi tasdiq, lekin SMS
 * provayderisiz (u hali ulanmagan: {@code LogSmsSender} — stub).
 *
 * <h3>Javob MATNI qaytariladi, yuborilmaydi</h3>
 *
 * <p>Metodlar {@link BotReply} qaytaradi, Telegramga o'zi yozmaydi. Yuborishni
 * {@link TelegramUpdateHandler} bajaradi. Shu tufayli butun mantiqni — soxta
 * kontakt, band raqam, o'chirilgan ro'yxat — tarmoqqa umuman chiqmasdan test
 * qilib bo'ladi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramRegistrationService {

    /**
     * Generatsiya qilinadigan PIN uzunligi.
     *
     * <p>Xodim qo'lda qo'yadigan PIN 4 xonali bo'lishi mumkin, lekin bu yerda
     * uni ODAM tanlamaydi — demak qisqartirishning qulaylik bo'yicha sababi
     * yo'q. 6 xona 10 000 o'rniga 1 000 000 kombinatsiya beradi. Validatsiya
     * chegarasi ({@code CustomerLoginRequest}: 4–6) buzilmaydi.
     */
    private static final int PIN_LENGTH = 6;

    /**
     * Kontakt ulashish chegarasi: bir chatdan soatiga 5 marta.
     *
     * <p>Har bir urinish bcrypt hisoblaydi va yangi PIN yozadi. Chegarasiz
     * bo'lsa, tugmani ketma-ket bosib turgan foydalanuvchi (yoki skript)
     * serverni bcrypt bilan band qilardi.
     */
    private static final int MAX_CONTACT_ATTEMPTS = 5;
    private static final long CONTACT_WINDOW_MS = 60 * 60_000;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final SettingsService settingsService;
    private final StaffNotificationService staffNotificationService;
    private final SimpleRateLimiter rateLimiter;

    /**
     * Storefront manzili — botdagi "kabinetga kirish" havolasi uchun.
     *
     * <p>Prod'da {@code SHOP_PUBLIC_BASE_URL} orqali beriladi (masalan
     * {@code https://protektor.uz}). Noto'g'ri qolsa mijoz PIN'ini oladi-yu,
     * qayerga kiritishni bilmaydi.
     */
    @Value("${shop.public-base-url:http://localhost:5183}")
    private String publicBaseUrl;

    // ─── /start ───

    /** {@code /start} — salomlashish va kontakt so'rash. */
    @Transactional(readOnly = true)
    public BotReply onStart(long chatId) {
        if (!settingsService.isTelegramRegistrationEnabled()) {
            return BotReply.of(closedMessage());
        }

        return customerRepository.findByTelegramChatId(chatId)
                .map(existing -> BotReply.of("""
                        👋 Assalomu alaykum, %s!

                        Siz allaqachon ro'yxatdan o'tgansiz.
                        Telefon: <b>%s</b>

                        PIN kodni unutgan bo'lsangiz — pastdagi tugma orqali \
                        kontaktingizni qayta yuboring, yangi PIN beriladi.

                        Kabinet: %s""".formatted(
                                escapeHtml(existing.getFullName()),
                                escapeHtml(existing.getPhone()),
                                loginUrl()),
                        TelegramApiClient.contactKeyboard("📱 Yangi PIN olish")))
                .orElseGet(() -> BotReply.of("""
                        👋 Assalomu alaykum!

                        <b>Protektor</b> shaxsiy kabinetiga ro'yxatdan o'tish uchun \
                        telefon raqamingizni tasdiqlang.

                        Pastdagi <b>«📱 Telefon raqamni yuborish»</b> tugmasini bosing — \
                        raqamni Telegramning o'zi yuboradi, qo'lda yozish shart emas.

                        Keyin sizga PIN kod beriladi va kabinetdan buyurtmalaringiz, \
                        xaridlaringiz va qarzlaringizni ko'ra olasiz.""",
                        TelegramApiClient.contactKeyboard("📱 Telefon raqamni yuborish")));
    }

    // ─── Kontakt ulashildi ───

    /**
     * Kontakt yuborilganda mijozni yaratadi yoki mavjudini bog'laydi va yangi
     * PIN beradi.
     *
     * @param contactUserId {@code contact.user_id} — kontakt EGASINING Telegram
     *                      ID'si. Telegram uni faqat kontakt Telegram
     *                      foydalanuvchisiga tegishli bo'lgandagina qo'shadi.
     */
    @Transactional
    public BotReply onContact(long chatId, TelegramSender from, Long contactUserId, String contactPhone) {
        if (!settingsService.isTelegramRegistrationEnabled()) {
            return BotReply.of(closedMessage(), TelegramApiClient.removeKeyboard());
        }

        // ⚠️ ENG MUHIM TEKSHIRUV. Telegramda foydalanuvchi o'z manzillar
        // kitobidagi ISTALGAN kontaktni yubora oladi — masalan qo'shnisining
        // raqamini. Bunday kontaktda `user_id` yo yo'q, yo boshqa odamniki.
        // Bu tekshiruvsiz istalgan odam begona raqamga mijoz akkaunti ochib,
        // uning PIN kodini o'zi ko'rib turardi va o'sha odamning xaridlari,
        // qarzlari va buyurtmalarini o'qiy olardi.
        if (contactUserId == null || contactUserId != from.id()) {
            log.warn("Telegram: begona kontakt yuborildi (chat={}, from={}, contactUser={})",
                    chatId, from.id(), contactUserId);
            return BotReply.of("""
                    ⚠️ Bu raqam sizniki emas.

                    Faqat O'ZINGIZNING raqamingiz bilan ro'yxatdan o'tish mumkin. \
                    Iltimos, pastdagi tugmani bosing — Telegram raqamni o'zi yuboradi.""",
                    TelegramApiClient.contactKeyboard("📱 Telefon raqamni yuborish"));
        }

        if (!rateLimiter.allow("telegram-register:" + chatId, MAX_CONTACT_ATTEMPTS, CONTACT_WINDOW_MS)) {
            return BotReply.of("⏳ Juda ko'p urinish. Iltimos, bir soatdan keyin qayta urinib ko'ring.",
                    TelegramApiClient.removeKeyboard());
        }

        String phone = PhoneNumberUtils.normalize(contactPhone);
        if (phone == null || !phone.matches("^\\+998\\d{9}$")) {
            // Portal login validatsiyasi faqat O'zbekiston raqamini qabul
            // qiladi. Boshqa formatdagi raqamni yozib qo'ysak, mijoz yozuvi
            // paydo bo'lardi-yu, u hech qachon kabinetga kira olmasdi.
            return BotReply.of("""
                    ⚠️ Faqat O'zbekiston raqamlari (+998…) qabul qilinadi.

                    Boshqa raqam bilan ro'yxatdan o'tish uchun do'kon bilan bog'laning.""",
                    TelegramApiClient.removeKeyboard());
        }

        Customer customer = customerRepository.findByPhone(phone).orElse(null);

        if (customer == null) {
            return registerNew(chatId, from, phone);
        }
        return linkExisting(chatId, from, customer);
    }

    /** Bot tushunmagan xabar — nima qilish kerakligini eslatadi. */
    @Transactional(readOnly = true)
    public BotReply onUnknown(long chatId) {
        if (!settingsService.isTelegramRegistrationEnabled()) {
            return BotReply.of(closedMessage());
        }
        return BotReply.of("""
                Ro'yxatdan o'tish uchun pastdagi tugmani bosing yoki /start buyrug'ini yuboring.""",
                TelegramApiClient.contactKeyboard("📱 Telefon raqamni yuborish"));
    }

    // ─── Ichki mantiq ───

    private BotReply registerNew(long chatId, TelegramSender from, String phone) {
        String pin = generatePin();

        Customer customer = Customer.builder()
                .fullName(resolveName(from, phone))
                .phone(phone)
                .customerType(CustomerType.INDIVIDUAL)
                .active(true)
                .portalEnabled(true)
                .telegramChatId(chatId)
                .telegramUsername(from.username())
                .telegramLinkedAt(LocalDateTime.now())
                .pinHash(passwordEncoder.encode(pin))
                .pinSetAt(LocalDateTime.now())
                .pinAttempts(0)
                // createdBy ATAYLAB null — bu yozuvni xodim emas, mijozning
                // o'zi yaratdi. Telegram maydonlari uni farqlab turadi.
                .build();

        customer = customerRepository.save(customer);
        log.info("Telegram orqali yangi mijoz ro'yxatdan o'tdi: {} (chat={})", phone, chatId);

        staffNotificationService.notifyNewCustomer(customer.getFullName(), phone, customer.getId());

        return BotReply.of(credentialsMessage("✅ Ro'yxatdan o'tdingiz!", customer, pin),
                TelegramApiClient.removeKeyboard());
    }

    private BotReply linkExisting(long chatId, TelegramSender from, Customer customer) {
        // Do'kon bloklagan mijozga kirish berilmaydi. Bloklashning ma'nosi
        // shundaki, u qayta kira olmasin — botdan aylanib o'tib bo'lmaydi.
        if (!Boolean.TRUE.equals(customer.getActive())) {
            return BotReply.of("""
                    ⚠️ Bu raqam bo'yicha hisob faol emas.

                    Iltimos, do'kon bilan bog'laning.""",
                    TelegramApiClient.removeKeyboard());
        }

        // Raqam BOSHQA Telegram akkauntga bog'langan bo'lsa — to'xtaymiz.
        //
        // Telegram raqam hozir shu odamniki ekanini tasdiqladi, ya'ni odatda bu
        // shunchaki yangi Telegram akkaunt. Lekin operator raqamni qayta sotgan
        // holat ham xuddi shunday ko'rinadi — va u yerda "bog'lashni ko'chirish"
        // begona odamga oldingi egasining xaridlari va QARZLARINI ochib berardi.
        // Bu qaror xodimniki: u eski bog'lanishni olib tashlashi kerak.
        boolean linkedElsewhere = customer.getTelegramChatId() != null
                && !customer.getTelegramChatId().equals(chatId);
        if (linkedElsewhere) {
            log.warn("Telegram: {} raqami boshqa chatga bog'langan (eski={}, yangi={})",
                    customer.getPhone(), customer.getTelegramChatId(), chatId);
            return BotReply.of("""
                    ⚠️ Bu raqam boshqa Telegram akkauntga bog'langan.

                    Xavfsizlik uchun uni faqat do'kon xodimi ko'chira oladi. \
                    Iltimos, do'kon bilan bog'laning.""",
                    TelegramApiClient.removeKeyboard());
        }

        boolean firstLink = customer.getTelegramChatId() == null;
        String pin = generatePin();

        customer.setTelegramChatId(chatId);
        customer.setTelegramUsername(from.username());
        if (firstLink) {
            customer.setTelegramLinkedAt(LocalDateTime.now());
        }
        customer.setPinHash(passwordEncoder.encode(pin));
        customer.setPinSetAt(LocalDateTime.now());
        customer.setPortalEnabled(true);
        // Qulf va urinishlar tozalanadi: raqam egaligi Telegram orqali qayta
        // tasdiqlandi, ya'ni bu PIN'ni terib topishga urinish emas.
        customer.setPinAttempts(0);
        customer.setPinLockedUntil(null);

        // Ism faqat BO'SH bo'lsa to'ldiriladi: xodim kiritgan to'liq ismni
        // ("Alisher Karimov, Avto-Servis") Telegram taxallusi bilan
        // almashtirib yuborish ma'lumot yo'qotish bo'lardi.
        if (customer.getFullName() == null || customer.getFullName().isBlank()) {
            customer.setFullName(resolveName(from, customer.getPhone()));
        }

        customerRepository.save(customer);
        log.info("Telegram kabinet kirishi berildi: {} (chat={}, birinchi={})",
                customer.getPhone(), chatId, firstLink);

        if (firstLink) {
            staffNotificationService.notifyNewCustomer(
                    customer.getFullName(), customer.getPhone(), customer.getId());
        }

        String title = firstLink ? "✅ Hisobingiz ulandi!" : "🔑 Yangi PIN kod";
        return BotReply.of(credentialsMessage(title, customer, pin),
                TelegramApiClient.removeKeyboard());
    }

    private String credentialsMessage(String title, Customer customer, String pin) {
        return """
                %s

                Ism: <b>%s</b>
                Telefon: <b>%s</b>
                PIN kod: <b><code>%s</code></b>

                Kabinetga kirish: %s

                ⚠️ PIN kodni hech kimga bermang. Uni kabinetdagi \
                <b>Profil</b> bo'limida o'zgartirishingiz mumkin."""
                .formatted(title,
                        escapeHtml(customer.getFullName()),
                        escapeHtml(customer.getPhone()),
                        pin,
                        loginUrl());
    }

    private String closedMessage() {
        return """
                ⚠️ Hozircha Telegram orqali ro'yxatdan o'tish yopiq.

                Iltimos, do'kon bilan bog'laning.""";
    }

    /**
     * Mijoz ismi: Telegram profilidagi ism, u bo'lmasa @username, u ham bo'lmasa raqam.
     *
     * <p>{@code full_name} — NOT NULL, shuning uchun bo'sh qoldirib bo'lmaydi.
     */
    private String resolveName(TelegramSender from, String phone) {
        String name = from.fullName();
        if (name == null) {
            name = from.username() != null ? from.username() : phone;
        }
        // customers.full_name — VARCHAR(150)
        return name.length() > 150 ? name.substring(0, 150) : name;
    }

    private String loginUrl() {
        String base = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/kirish";
    }

    /** Boshida nol bo'lishi mumkin — shuning uchun raqam emas, satr sifatida yig'iladi. */
    private static String generatePin() {
        StringBuilder pin = new StringBuilder(PIN_LENGTH);
        for (int i = 0; i < PIN_LENGTH; i++) {
            pin.append(RANDOM.nextInt(10));
        }
        return pin.toString();
    }
}
