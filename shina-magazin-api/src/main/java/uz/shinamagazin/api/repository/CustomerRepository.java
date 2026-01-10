package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Customer;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByPhone(String phone);

    Optional<Customer> findByPhoneAndPortalEnabledTrue(String phone);

    boolean existsByPhone(String phone);

    Page<Customer> findByActiveTrue(Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.active = true AND " +
            "(LOWER(c.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "c.phone LIKE CONCAT('%', :search, '%'))")
    Page<Customer> searchCustomers(@Param("search") String search, Pageable pageable);

    // Qarzli mijozlar
    @Query("SELECT c FROM Customer c WHERE c.active = true AND c.balance < 0")
    List<Customer> findCustomersWithDebt();

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.active = true")
    long countActiveCustomers();

    @Query("SELECT SUM(c.balance) FROM Customer c WHERE c.active = true AND c.balance < 0")
    java.math.BigDecimal getTotalDebt();
}
