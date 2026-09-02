package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.SchedulerLock;

import java.time.LocalDateTime;

@Repository
public interface SchedulerLockRepository extends JpaRepository<SchedulerLock, String> {

    /**
     * Atomik olish: faqat muddati o'tgan (bo'sh) qulfni oladi.
     *
     * @return 1 — olindi, 0 — band (yoki qator hali yo'q)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE SchedulerLock l SET l.lockedUntil = :until, l.lockedBy = :owner
            WHERE l.name = :name AND l.lockedUntil < :now""")
    int acquire(@Param("name") String name,
                @Param("until") LocalDateTime until,
                @Param("owner") String owner,
                @Param("now") LocalDateTime now);

    /** Faqat O'Z qulfini bo'shatadi — begona instansiyanikini emas. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE SchedulerLock l SET l.lockedUntil = :releasedAt
            WHERE l.name = :name AND l.lockedBy = :owner""")
    int release(@Param("name") String name,
                @Param("owner") String owner,
                @Param("releasedAt") LocalDateTime releasedAt);
}
