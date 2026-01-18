package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);

    Page<AuditLog> findByUserId(Long userId, Pageable pageable);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.createdAt BETWEEN :startDate AND :endDate
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> findByDateRange(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.userId = :userId
        AND a.createdAt BETWEEN :startDate AND :endDate
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> findByUserIdAndDateRange(
        @Param("userId") Long userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
        AND (:action IS NULL OR a.action = :action)
        AND (:userId IS NULL OR a.userId = :userId)
        AND (:search IS NULL OR LOWER(a.username) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> searchAuditLogs(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId,
        @Param("search") String search,
        Pageable pageable
    );

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
        AND (:action IS NULL OR a.action = :action)
        AND (:userId IS NULL OR a.userId = :userId)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> filterAuditLogs(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId,
        Pageable pageable
    );

    @Query("SELECT DISTINCT a.entityType FROM AuditLog a ORDER BY a.entityType")
    List<String> findAllEntityTypes();

    @Query("SELECT DISTINCT a.action FROM AuditLog a ORDER BY a.action")
    List<String> findAllActions();

    void deleteByCreatedAtBefore(LocalDateTime date);
}
