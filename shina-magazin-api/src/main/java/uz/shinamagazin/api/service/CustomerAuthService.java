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

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerAuthService {

    private static final int MAX_PIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 30;

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public CustomerAuthResponse login(CustomerLoginRequest request) {
        Customer customer = customerRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new BadRequestException("Telefon raqam yoki PIN kod noto'g'ri"));

        // Portal yoqilganligini tekshirish
        if (!Boolean.TRUE.equals(customer.getPortalEnabled())) {
            throw new BadRequestException("Sizning hisobingiz uchun portal yoqilmagan. Iltimos, do'kon bilan bog'laning.");
        }

        // Account active ekanligini tekshirish
        if (!Boolean.TRUE.equals(customer.getActive())) {
            throw new BadRequestException("Sizning hisobingiz faol emas");
        }

        // PIN o'rnatilganligini tekshirish
        if (customer.getPinHash() == null) {
            throw new BadRequestException("PIN kod o'rnatilmagan. Iltimos, do'kon bilan bog'laning.");
        }

        // Account bloklangan yoki yo'qligini tekshirish
        if (isAccountLocked(customer)) {
            int remainingMinutes = getRemainingLockMinutes(customer);
            throw new BadRequestException(
                    String.format("Sizning hisobingiz vaqtincha bloklangan. %d daqiqadan keyin qayta urinib ko'ring.", remainingMinutes)
            );
        }

        // PIN tekshirish
        if (!passwordEncoder.matches(request.getPin(), customer.getPinHash())) {
            handleFailedAttempt(customer);
            int remainingAttempts = MAX_PIN_ATTEMPTS - customer.getPinAttempts();
            if (remainingAttempts > 0) {
                throw new BadRequestException(
                        String.format("PIN kod noto'g'ri. Qolgan urinishlar soni: %d", remainingAttempts)
                );
            } else {
                throw new BadRequestException(
                        String.format("Sizning hisobingiz %d daqiqaga bloklandi", LOCKOUT_MINUTES)
                );
            }
        }

        // Muvaffaqiyatli login - urinishlarni reset qilish
        resetPinAttempts(customer);
        customer.setLastLoginAt(LocalDateTime.now());
        customerRepository.save(customer);

        // Token generatsiya
        String accessToken = tokenProvider.generateCustomerToken(customer.getPhone());
        String refreshToken = tokenProvider.generateCustomerRefreshToken(customer.getPhone());

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

        String newAccessToken = tokenProvider.generateCustomerToken(phone);
        String newRefreshToken = tokenProvider.generateCustomerRefreshToken(phone);

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
        }
        customerRepository.save(customer);

        log.info("Portal access {} for customer: {}", enabled ? "enabled" : "disabled", customer.getPhone());
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
