package uz.shinamagazin.api.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.repository.CustomerRepository;

@Service
@RequiredArgsConstructor
public class CustomerUserDetailsService implements UserDetailsService {

    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String phone) throws UsernameNotFoundException {
        Customer customer = customerRepository.findByPhoneAndPortalEnabledTrue(phone)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Mijoz topilmadi yoki portal yoqilmagan: " + phone
                ));

        return new CustomerUserDetails(customer);
    }

    @Transactional(readOnly = true)
    public UserDetails loadCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Mijoz topilmadi: " + id
                ));

        if (!customer.getPortalEnabled()) {
            throw new UsernameNotFoundException("Mijoz portali yoqilmagan: " + id);
        }

        return new CustomerUserDetails(customer);
    }
}
