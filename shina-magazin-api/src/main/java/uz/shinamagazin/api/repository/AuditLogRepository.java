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

    // ==================== GROUPED PAGINATION QUERIES ====================

    /**
     * Get distinct correlation IDs with filters, ordered by max created_at desc.
     * Returns correlation_id and the max timestamp for ordering.
     */
    @Query(value = """
        SELECT correlation_id, MAX(created_at) as max_time
        FROM audit_logs
        WHERE correlation_id IS NOT NULL
        AND (:entityType IS NULL OR entity_type = :entityType)
        AND (:action IS NULL OR action = :action)
        AND (:userId IS NULL OR user_id = :userId)
        GROUP BY correlation_id
        ORDER BY max_time DESC
        """, nativeQuery = true)
    List<Object[]> findDistinctCorrelationIds(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId
    );

    /**
     * Count distinct correlation IDs (groups with correlation_id)
     */
    @Query(value = """
        SELECT COUNT(DISTINCT correlation_id)
        FROM audit_logs
        WHERE correlation_id IS NOT NULL
        AND (:entityType IS NULL OR entity_type = :entityType)
        AND (:action IS NULL OR action = :action)
        AND (:userId IS NULL OR user_id = :userId)
        """, nativeQuery = true)
    long countDistinctCorrelationIds(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId
    );

    /**
     * Get logs by correlation IDs
     */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.correlationId IN :correlationIds
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> findByCorrelationIdIn(@Param("correlationIds") List<java.util.UUID> correlationIds);

    /**
     * Get logs without correlation_id (for time-based grouping)
     */
    @Query("""
        SELECT a FROM AuditLog a
        WHERE a.correlationId IS NULL
        AND (:entityType IS NULL OR a.entityType = :entityType)
        AND (:action IS NULL OR a.action = :action)
        AND (:userId IS NULL OR a.userId = :userId)
        ORDER BY a.createdAt DESC
        """)
    List<AuditLog> findUncorrelatedLogs(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId,
        Pageable pageable
    );

    /**
     * Count logs without correlation_id
     */
    @Query("""
        SELECT COUNT(a) FROM AuditLog a
        WHERE a.correlationId IS NULL
        AND (:entityType IS NULL OR a.entityType = :entityType)
        AND (:action IS NULL OR a.action = :action)
        AND (:userId IS NULL OR a.userId = :userId)
        """)
    long countUncorrelatedLogs(
        @Param("entityType") String entityType,
        @Param("action") String action,
        @Param("userId") Long userId
    );
}
