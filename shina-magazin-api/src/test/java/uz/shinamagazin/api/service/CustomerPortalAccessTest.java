package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.security.JwtTokenProvider;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Portal kirishini o'chirish Telegram bog'lanishini ham uzadi.
 *
 * <p>Bu shunchaki tozalik emas, ishlaydigan JARAYONNING bir qismi: bot
 * "bu raqam boshqa Telegram akkauntga bog'langan, do'kon bilan bog'laning"
 * deydi, ya'ni xodimda bog'lanishni uzadigan vosita BO'LISHI kerak. Aks
 * holda Telegramini almashtirgan mijoz boshi berk ko'chaga kirib qolardi:
 * eski akkaunt yo'q, yangisi esa rad etiladi.
 */
class CustomerPortalAccessTest {

    private CustomerRepository customerRepository;
    private CustomerAuthService service;

    @BeforeEach
    void setUp() {
        customerRepository = mock(CustomerRepository.class);
        service = new CustomerAuthService(
                customerRepository, mock(PasswordEncoder.class), mock(JwtTokenProvider.class));
        when(customerRepository.save(org.mockito.ArgumentMatchers.any(Customer.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Portal o'chirilganda Telegram bog'lanishi uziladi")
    void disablingPortalUnlinksTelegram() {
        Customer customer = linkedCustomer();
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

        service.togglePortalAccess(1L, false);

        assertThat(customer.getTelegramChatId()).isNull();
        assertThat(customer.getTelegramUsername()).isNull();
        assertThat(customer.getTelegramLinkedAt()).isNull();
        // Mavjud xatti-harakat saqlanib qolgan
        assertThat(customer.getPinHash()).isNull();
        assertThat(customer.getPortalEnabled()).isFalse();
    }

    @Test
    @DisplayName("Portal yoqilganda bog'lanish saqlanadi")
    void enablingPortalKeepsLink() {
        Customer customer = linkedCustomer();
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

        service.togglePortalAccess(1L, true);

        assertThat(customer.getTelegramChatId()).isEqualTo(900_001L);
        assertThat(customer.getPortalEnabled()).isTrue();
    }

    private static Customer linkedCustomer() {
        return Customer.builder()
                .fullName("Test Mijoz")
                .phone("+998907654321")
                .active(true)
                .portalEnabled(true)
                .pinHash("hash")
                .pinSetAt(LocalDateTime.now())
                .telegramChatId(900_001L)
                .telegramUsername("mijoz")
                .telegramLinkedAt(LocalDateTime.now())
                .build();
    }
}
