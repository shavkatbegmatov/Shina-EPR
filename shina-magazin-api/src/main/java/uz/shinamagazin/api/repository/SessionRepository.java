package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Session;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Long> {

    Optional<Session> findByTokenHash(String tokenHash);

    @Query("SELECT s FROM Session s WHERE s.user.id = :userId AND s.isActive = true ORDER BY s.lastActivityAt DESC")
    List<Session> findActiveSessionsByUserId(@Param("userId") Long userId);

    @Query("SELECT s FROM Session s WHERE s.user.id = :userId ORDER BY s.createdAt DESC")
    List<Session> findAllSessionsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Session s SET s.isActive = false, s.revokedAt = :revokedAt, s.revokedBy = :revokedBy, s.revokeReason = :reason WHERE s.id = :sessionId AND s.user.id = :userId")
    int revokeSession(@Param("sessionId") Long sessionId, @Param("userId") Long userId,
                      @Param("revokedAt") LocalDateTime revokedAt, @Param("revokedBy") Long revokedBy,
                      @Param("reason") String reason);

    @Modifying
    @Query("UPDATE Session s SET s.isActive = false, s.revokedAt = :revokedAt, s.revokedBy = :revokedBy, s.revokeReason = :reason WHERE s.user.id = :userId AND s.id != :excludeSessionId AND s.isActive = true")
    int revokeAllSessionsExcept(@Param("userId") Long userId, @Param("excludeSessionId") Long excludeSessionId,
                                  @Param("revokedAt") LocalDateTime revokedAt, @Param("revokedBy") Long revokedBy,
                                  @Param("reason") String reason);

    @Modifying
    @Query("UPDATE Session s SET s.lastActivityAt = :activityTime WHERE s.tokenHash = :tokenHash AND s.isActive = true")
    void updateLastActivity(@Param("tokenHash") String tokenHash, @Param("activityTime") LocalDateTime activityTime);

    @Modifying
    @Query("DELETE FROM Session s WHERE s.expiresAt < :now")
    int deleteExpiredSessions(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.user.id = :userId AND s.isActive = true")
    long countActiveSessionsByUserId(@Param("userId") Long userId);
}
