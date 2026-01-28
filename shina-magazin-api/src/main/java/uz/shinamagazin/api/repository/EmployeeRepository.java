package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.enums.EmployeeStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Page<Employee> findByStatusNot(EmployeeStatus status, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.status <> 'TERMINATED' AND " +
            "(LOWER(e.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "e.phone LIKE CONCAT('%', :search, '%') OR " +
            "LOWER(e.position) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Employee> searchEmployees(@Param("search") String search, Pageable pageable);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    boolean existsByUserId(Long userId);

    boolean existsByUserIdAndIdNot(Long userId, Long id);

    Optional<Employee> findByUserId(Long userId);

    List<Employee> findByStatus(EmployeeStatus status);

    List<Employee> findByDepartment(String department);

    @Query("SELECT DISTINCT e.department FROM Employee e WHERE e.department IS NOT NULL ORDER BY e.department")
    List<String> findAllDepartments();

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.status = :status")
    long countByStatus(@Param("status") EmployeeStatus status);
}
