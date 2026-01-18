package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.LoginAttempt;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    // Get all login attempts for a user
    List<LoginAttempt> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Get login attempts by username (even if user doesn't exist)
    List<LoginAttempt> findByUsernameOrderByCreatedAtDesc(String username);

    // Get recent failed attempts for a user/IP (for lockout logic)
    @Query("SELECT la FROM LoginAttempt la WHERE la.username = :username " +
           "AND la.status = 'FAILED' " +
           "AND la.createdAt > :since " +
           "ORDER BY la.createdAt DESC")
    List<LoginAttempt> findRecentFailedAttempts(
        @Param("username") String username,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT la FROM LoginAttempt la WHERE la.ipAddress = :ipAddress " +
           "AND la.status = 'FAILED' " +
           "AND la.createdAt > :since " +
           "ORDER BY la.createdAt DESC")
    List<LoginAttempt> findRecentFailedAttemptsByIp(
        @Param("ipAddress") String ipAddress,
        @Param("since") LocalDateTime since
    );

    // Count failed attempts in time window
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.username = :username " +
           "AND la.status = 'FAILED' " +
           "AND la.createdAt > :since")
    long countRecentFailedAttempts(
        @Param("username") String username,
        @Param("since") LocalDateTime since
    );

    // Get login attempts with pagination and filters
    @Query("SELECT la FROM LoginAttempt la WHERE " +
           "(:username IS NULL OR la.username = :username) " +
           "AND (:status IS NULL OR la.status = :status) " +
           "AND (:ipAddress IS NULL OR la.ipAddress = :ipAddress) " +
           "AND (:fromDate IS NULL OR la.createdAt >= :fromDate) " +
           "AND (:toDate IS NULL OR la.createdAt <= :toDate) " +
           "ORDER BY la.createdAt DESC")
    Page<LoginAttempt> findWithFilters(
        @Param("username") String username,
        @Param("status") LoginAttempt.LoginStatus status,
        @Param("ipAddress") String ipAddress,
        @Param("fromDate") LocalDateTime fromDate,
        @Param("toDate") LocalDateTime toDate,
        Pageable pageable
    );

    // Delete old login attempts (cleanup task)
    @Modifying
    @Query("DELETE FROM LoginAttempt la WHERE la.createdAt < :before")
    int deleteOldAttempts(@Param("before") LocalDateTime before);
}
