package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Supplier;

import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    List<Supplier> findByActiveTrue();

    Page<Supplier> findByActiveTrue(Pageable pageable);

    @Query("SELECT s FROM Supplier s WHERE s.active = true AND " +
           "(LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.contactPerson) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Supplier> searchSuppliers(@Param("search") String search, Pageable pageable);

    @Query("SELECT s FROM Supplier s WHERE s.active = true AND s.balance > 0")
    List<Supplier> findSuppliersWithDebt();

    boolean existsByName(String name);
}
