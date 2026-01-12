package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Permission;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByCode(String code);

    boolean existsByCode(String code);

    List<Permission> findByModule(String module);

    List<Permission> findByModuleOrderByActionAsc(String module);

    @Query("SELECT DISTINCT p.module FROM Permission p ORDER BY p.module")
    List<String> findAllModules();

    @Query("SELECT p FROM Permission p WHERE p.code IN :codes")
    Set<Permission> findByCodeIn(@Param("codes") Set<String> codes);

    @Query("""
        SELECT DISTINCT p FROM Permission p
        JOIN p.roles r
        JOIN r.users u
        WHERE u.id = :userId AND r.isActive = true
        """)
    Set<Permission> findByUserId(@Param("userId") Long userId);

    @Query("SELECT p FROM Permission p ORDER BY p.module, p.action")
    List<Permission> findAllOrderByModuleAndAction();
}
