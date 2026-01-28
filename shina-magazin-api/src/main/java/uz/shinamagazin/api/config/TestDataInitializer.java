package uz.shinamagazin.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.enums.CustomerType;
import uz.shinamagazin.api.repository.CustomerRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Test muhiti uchun test mijozni yaratadi yoki yangilaydi.
 * Faqat "dev" profilida ishlaydi.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class TestDataInitializer implements CommandLineRunner {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String TEST_PHONE = "+998901234567";
    private static final String TEST_PIN = "1234";

    @Override
    @Transactional
    public void run(String... args) {
        setupTestCustomer();
    }

    private void setupTestCustomer() {
        Customer customer = customerRepository.findByPhone(TEST_PHONE)
                .orElseGet(() -> {
                    log.info("Creating test customer with phone: {}", TEST_PHONE);
                    return Customer.builder()
                            .fullName("Test Mijoz")
                            .phone(TEST_PHONE)
                            .customerType(CustomerType.INDIVIDUAL)
                            .balance(BigDecimal.valueOf(100000))
                            .active(true)
                            .build();
                });

        // Portal kirishini yoqish va PIN o'rnatish
        customer.setPortalEnabled(true);
        customer.setPinHash(passwordEncoder.encode(TEST_PIN));
        customer.setPinSetAt(LocalDateTime.now());
        customer.setPinAttempts(0);
        customer.setPinLockedUntil(null);
        customer.setPreferredLanguage("uz");

        customerRepository.save(customer);
        log.info("Test customer portal enabled - Phone: {}, PIN: {}", TEST_PHONE, TEST_PIN);
    }
}
