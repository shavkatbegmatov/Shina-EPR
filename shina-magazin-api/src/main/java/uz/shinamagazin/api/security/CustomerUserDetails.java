package uz.shinamagazin.api.security;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import uz.shinamagazin.api.entity.Customer;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;

@Getter
@AllArgsConstructor
public class CustomerUserDetails implements UserDetails {

    private final Customer customer;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_CUSTOMER")
        );
    }

    @Override
    public String getPassword() {
        return customer.getPinHash();
    }

    @Override
    public String getUsername() {
        return customer.getPhone();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        // Agar pinLockedUntil vaqti o'tgan bo'lsa, account ochiq
        if (customer.getPinLockedUntil() == null) {
            return true;
        }
        return LocalDateTime.now().isAfter(customer.getPinLockedUntil());
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return customer.getActive() && customer.getPortalEnabled();
    }

    public Long getId() {
        return customer.getId();
    }

    public String getFullName() {
        return customer.getFullName();
    }

    public String getPhone() {
        return customer.getPhone();
    }

    public String getPreferredLanguage() {
        return customer.getPreferredLanguage();
    }
}
