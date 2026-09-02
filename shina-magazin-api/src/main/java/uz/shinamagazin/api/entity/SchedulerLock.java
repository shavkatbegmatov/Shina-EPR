package uz.shinamagazin.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Rejalashtirilgan vazifa qulfi (V42). Qarang {@code SchedulerLockService}.
 *
 * <p>Ataylab {@code BaseEntity}'dan meros olmaydi: audit listener'ga ham,
 * created/updated ustunlariga ham hojat yo'q — bu texnik yozuv.
 */
@Entity
@Table(name = "scheduler_locks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SchedulerLock {

    @Id
    @Column(name = "name", length = 100, nullable = false)
    private String name;

    /** Shu vaqtgacha qulf band. O'tib ketgan bo'lsa — egasi yiqilgan, olsa bo'ladi. */
    @Column(name = "locked_until", nullable = false)
    private LocalDateTime lockedUntil;

    /** Diagnostika: qaysi instansiya (host:pid) olgan. */
    @Column(name = "locked_by", length = 100)
    private String lockedBy;
}
