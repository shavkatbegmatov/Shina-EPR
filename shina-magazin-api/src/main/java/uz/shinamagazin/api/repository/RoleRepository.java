package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.RoleEntity;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface RoleRepository extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByCode(String code);

    Optional<RoleEntity> findByName(String name);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    List<RoleEntity> findByIsActiveTrue();

    List<RoleEntity> findByIsActiveTrueOrderByNameAsc();

    List<RoleEntity> findByIsSystemTrue();

    @Query("SELECT r FROM RoleEntity r WHERE r.isActive = true AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<RoleEntity> searchRoles(@Param("search") String search, Pageable pageable);

    @Query("SELECT r FROM RoleEntity r WHERE r.isActive = true")
    Page<RoleEntity> findAllActive(Pageable pageable);

    @Query("""
        SELECT r FROM RoleEntity r
        JOIN r.users u
        WHERE u.id = :userId AND r.isActive = true
        """)
    Set<RoleEntity> findByUserId(@Param("userId") Long userId);

    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions WHERE r.id = :id")
    Optional<RoleEntity> findByIdWithPermissions(@Param("id") Long id);

    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions LEFT JOIN FETCH r.users WHERE r.id = :id")
    Optional<RoleEntity> findByIdWithPermissionsAndUsers(@Param("id") Long id);

    @Query("SELECT r FROM RoleEntity r LEFT JOIN FETCH r.permissions WHERE r.code = :code")
    Optional<RoleEntity> findByCodeWithPermissions(@Param("code") String code);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.id = :roleId")
    Long countUsersByRoleId(@Param("roleId") Long roleId);
}
