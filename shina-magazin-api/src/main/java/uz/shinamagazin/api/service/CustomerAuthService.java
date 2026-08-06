package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CustomerLoginRequest;
import uz.shinamagazin.api.dto.request.CustomerSetPinRequest;
import uz.shinamagazin.api.dto.response.CustomerAuthResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;
import uz.shinamagazin.api.util.PhoneNumberUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerAuthService {

    private static final int MAX_PIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 30;

    /**
     * Kirish muvaffaqiyatsiz bo'lganda YAGONA xabar — raqam ro'yxatdan
     * o'tganmi yoki yo'qmi, farqi bo'lmasin.
     *
     * <p>Qulflash siyosati ataylab kiritilgan: "qolgan urinishlar: N" ni
     * ko'rsatib bo'lmaydi (u akkaunt mavjudligini bildiradi), lekin siyosatni
     * oldindan aytish haqiqiy foydalanuvchini ogohlantiradi va hech qanday
     * ma'lumot sizdirmaydi.
     */
    private static final String INVALID_CREDENTIALS_MESSAGE =
            "Telefon raqam yoki PIN kod noto'g'ri. "
                    + MAX_PIN_ATTEMPTS + " marta xato kiritilsa hisob "
                    + LOCKOUT_MINUTES + " daqiqaga bloklanadi.";

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    /**
     * Mavjud bo'lmagan raqam uchun ishlatiladigan soxta hash.
     *
     * <p>Bcrypt ataylab sekin. Agar raqam topilmaganda uni umuman
     * hisoblamasak, javob sezilarli darajada tez qaytadi va hujumchi javob
     * VAQTIGA qarab raqam ro'yxatdan o'tganini aniqlay oladi — xabarlar bir
     * xil bo'lsa ham. Shuning uchun bu holatda ham bcrypt bajariladi.
     */
    private volatile String dummyPinHash;

    /**
     * Mijoz kirishi.
     *
     * <h3>Nega barcha kirish xatolari BIR XIL xabar qaytaradi</h3>
     *
     * <p>Ilgari bu metod oltita farqli xabar berardi: "portal yoqilmagan",
     * "hisob faol emas", "PIN o'rnatilmagan", "bloklangan, N daqiqa",
     * "qolgan urinishlar: N" va umumiy "telefon yoki PIN noto'g'ri". Faqat
     * OXIRGISI raqam ro'yxatdan o'tmaganda chiqardi — ya'ni javobning o'zi
     * telefon raqam do'kon mijozimi yoki yo'qmi degan savolga aniq javob
     * berardi. Hujumchi raqamlar ro'yxatini aylanib chiqib, do'konning butun
     * mijoz bazasini tiklashi mumkin edi (tijoriy va shaxsiy ma'lumot), va
     * qaysi raqamlarga 4 xonali PIN tanlashga arziydi — bilib olardi.
     *
     * <p>Yechim: akkaunt HOLATI haqidagi aniq xabar faqat PIN TO'G'RI
     * bo'lgandan keyin beriladi. PIN'ni bilgan odam allaqachon o'z akkaunti
     * haqida gapiryapti, unga "portal yoqilmagan" deb aytish xavfsiz va
     * foydali. PIN noto'g'ri bo'lsa yoki raqam topilmasa — yagona umumiy xabar.
     *
     * <p>Umumiy xabarga qulflash siyosati qo'shilgan, shunda haqiqiy
     * foydalanuvchi ogohlantirishni yo'qotmaydi ("qolgan urinishlar: N" ni
     * ko'rsatib bo'lmaydi — u aynan akkaunt mavjudligini bildiradi).
     */
    @Transactional
    public CustomerAuthResponse login(CustomerLoginRequest request) {
        Customer customer = customerRepository.findByPhone(PhoneNumberUtils.normalize(request.getPhone()))
                .orElse(null);

        // PIN tekshiruvi HAR DOIM bajariladi — mavjud bo'lmagan raqam uchun ham.
        // Aks holda "topilmadi" javobi sezilarli darajada tez qaytib, javob
        // vaqtining o'zi enumeration kanaliga aylanardi.
        String storedHash = (customer != null) ? customer.getPinHash() : null;
        boolean pinMatches = verifyPin(request.getPin(), storedHash);

        if (!pinMatches) {
            // Urinishni faqat haqiqiy va hali bloklanmagan akkaunt uchun sanaymiz.
            // Bloklangan akkauntni yana oshirish qulfni adolatsiz uzaytirardi.
            if (customer != null && storedHash != null && !isAccountLocked(customer)) {
                handleFailedAttempt(customer);
            }
            throw new BadRequestException(INVALID_CREDENTIALS_MESSAGE);
        }

        // ─── PIN to'g'ri: endi akkaunt holati haqida aniq gapirish xavfsiz ───

        if (isAccountLocked(customer)) {
            // Diqqat: to'g'ri PIN ham qulfni ochmaydi va urinishlarni tozalamaydi.
            throw new BadRequestException(String.format(
                    "Sizning hisobingiz vaqtincha bloklangan. %d daqiqadan keyin qayta urinib ko'ring.",
                    getRemainingLockMinutes(customer)));
        }

        if (!Boolean.TRUE.equals(customer.getPortalEnabled())) {
            throw new BadRequestException("Sizning hisobingiz uchun portal yoqilmagan. Iltimos, do'kon bilan bog'laning.");
        }

        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new BadRequestException("Sizning hisobingiz faol emas");
        }

        // Muvaffaqiyatli login - urinishlarni reset qilish
        resetPinAttempts(customer);
        customer.setLastLoginAt(LocalDateTime.now());
        customerRepository.save(customer);

        // Token generatsiya (customerId bilan WebSocket uchun)
        String accessToken = tokenProvider.generateCustomerToken(customer.getPhone(), customer.getId());
        String refreshToken = tokenProvider.generateCustomerRefreshToken(customer.getPhone(), customer.getId());

        log.info("Customer logged in successfully: {}", customer.getPhone());

        return CustomerAuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .customer(CustomerAuthResponse.CustomerProfileResponse.from(customer))
                .build();
    }

    @Transactional
    public CustomerAuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Refresh token yaroqsiz yoki muddati o'tgan");
        }

        if (!tokenProvider.isCustomerToken(refreshToken)) {
            throw new BadRequestException("Noto'g'ri token turi");
        }

        String phone = tokenProvider.getUsernameFromToken(refreshToken);
        Customer customer = customerRepository.findByPhoneAndPortalEnabledTrue(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "telefon", phone));

        String newAccessToken = tokenProvider.generateCustomerToken(phone, customer.getId());
        String newRefreshToken = tokenProvider.generateCustomerRefreshToken(phone, customer.getId());

        return CustomerAuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .customer(CustomerAuthResponse.CustomerProfileResponse.from(customer))
                .build();
    }

    /**
     * Staff tomonidan mijozga PIN o'rnatish
     */
    @Transactional
    public void setCustomerPin(Long customerId, CustomerSetPinRequest request) {
        if (!request.getPin().equals(request.getConfirmPin())) {
            throw new BadRequestException("PIN kodlar mos kelmadi");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        customer.setPinHash(passwordEncoder.encode(request.getPin()));
        customer.setPinSetAt(LocalDateTime.now());
        customer.setPinAttempts(0);
        customer.setPinLockedUntil(null);
        customer.setPortalEnabled(true);
        customerRepository.save(customer);

        log.info("PIN set for customer: {} by staff", customer.getPhone());
    }

    /**
     * Mijozning o'zi PIN o'zgartirish
     */
    @Transactional
    public void changePin(Long customerId, String currentPin, String newPin, String confirmNewPin) {
        if (!newPin.equals(confirmNewPin)) {
            throw new BadRequestException("Yangi PIN kodlar mos kelmadi");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        if (!passwordEncoder.matches(currentPin, customer.getPinHash())) {
            throw new BadRequestException("Joriy PIN kod noto'g'ri");
        }

        customer.setPinHash(passwordEncoder.encode(newPin));
        customer.setPinSetAt(LocalDateTime.now());
        customerRepository.save(customer);

        log.info("Customer changed their PIN: {}", customer.getPhone());
    }

    /**
     * Portal kirishni yoqish/o'chirish (Staff uchun)
     */
    @Transactional
    public void togglePortalAccess(Long customerId, boolean enabled) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        customer.setPortalEnabled(enabled);
        if (!enabled) {
            // Portal o'chirilganda PIN va urinishlarni tozalash
            customer.setPinHash(null);
            customer.setPinSetAt(null);
            customer.setPinAttempts(0);
            customer.setPinLockedUntil(null);

            // Telegram bog'lanishi ham uziladi.
            //
            // Bot raqami BOSHQA Telegram akkauntga bog'langan odamga "buni
            // faqat do'kon xodimi ko'chira oladi" deydi — xodimning shu ishni
            // qiladigan yagona vositasi aynan shu amal. Bog'lanish qolib
            // ketsa, mijoz Telegramini almashtirganda (yoki eski akkauntini
            // yo'qotganda) qayta ro'yxatdan o'ta olmay, boshi berk ko'chaga
            // kirib qolardi.
            customer.setTelegramChatId(null);
            customer.setTelegramUsername(null);
            customer.setTelegramLinkedAt(null);
        }
        customerRepository.save(customer);

        log.info("Portal access {} for customer: {}", enabled ? "enabled" : "disabled", customer.getPhone());
    }

    /**
     * PIN'ni tekshiradi. Hash bo'lmasa (raqam topilmadi yoki PIN o'rnatilmagan)
     * ham bcrypt bajariladi — javob vaqti bir xil qolishi uchun.
     */
    private boolean verifyPin(String rawPin, String storedHash) {
        if (storedHash != null) {
            return passwordEncoder.matches(rawPin, storedHash);
        }
        passwordEncoder.matches(rawPin, dummyPinHash());
        return false;
    }

    private String dummyPinHash() {
        String hash = dummyPinHash;
        if (hash == null) {
            synchronized (this) {
                hash = dummyPinHash;
                if (hash == null) {
                    // Qiymatning o'zi ahamiyatsiz — faqat bcrypt ishlashi uchun kerak
                    hash = passwordEncoder.encode("constant-time-placeholder");
                    dummyPinHash = hash;
                }
            }
        }
        return hash;
    }

    private boolean isAccountLocked(Customer customer) {
        if (customer.getPinLockedUntil() == null) {
            return false;
        }
        return LocalDateTime.now().isBefore(customer.getPinLockedUntil());
    }

    private int getRemainingLockMinutes(Customer customer) {
        if (customer.getPinLockedUntil() == null) {
            return 0;
        }
        long minutes = java.time.Duration.between(LocalDateTime.now(), customer.getPinLockedUntil()).toMinutes();
        return (int) Math.max(0, minutes + 1); // +1 to round up
    }

    private void handleFailedAttempt(Customer customer) {
        int attempts = customer.getPinAttempts() != null ? customer.getPinAttempts() : 0;
        attempts++;
        customer.setPinAttempts(attempts);

        if (attempts >= MAX_PIN_ATTEMPTS) {
            customer.setPinLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
            log.warn("Customer account locked due to too many failed attempts: {}", customer.getPhone());
        }

        customerRepository.save(customer);
    }

    private void resetPinAttempts(Customer customer) {
        customer.setPinAttempts(0);
        customer.setPinLockedUntil(null);
    }
}
