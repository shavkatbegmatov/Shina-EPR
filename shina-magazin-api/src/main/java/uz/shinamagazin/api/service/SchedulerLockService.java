package uz.shinamagazin.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import uz.shinamagazin.api.entity.SchedulerLock;
import uz.shinamagazin.api.repository.SchedulerLockRepository;

import java.net.InetAddress;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * DB'ga asoslangan vazifa qulfi — bir nechta instansiya bir xil rejalashtirilgan
 * vazifani parallel bajarmasin.
 *
 * <p>Qarz eslatmalari kabi vazifalar idempotent emas: ikki instansiya (yoki deploy
 * paytida bir vaqtda tirik eski va yangi konteyner) 09:00 da bir vaqtda ishga tushsa,
 * har eslatma ikki marta ketardi. Qulf TTL bilan olinadi — egasi yiqilsa, muddat
 * o'tgach boshqa instansiya olib ketadi.
 *
 * <p>Har bir olish/bo'shatish ALOHIDA tranzaksiyada (REQUIRES_NEW): vazifaning o'zi
 * tranzaksiyasiz bo'lishi yoki yiqilishi qulfga ta'sir qilmasin.
 */
@Service
@Slf4j
public class SchedulerLockService {

    private final SchedulerLockRepository repository;
    private final TransactionTemplate requiresNew;
    private final String owner;

    public SchedulerLockService(SchedulerLockRepository repository,
                                PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.owner = resolveOwner();
    }

    /** Qulfni oladi; band bo'lsa false. */
    public boolean tryAcquire(String name, Duration ttl) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plus(ttl);
        Boolean acquired = requiresNew.execute(status -> {
            if (repository.acquire(name, until, owner, now) == 1) {
                return true;
            }
            if (repository.existsById(name)) {
                return false; // band
            }
            try {
                repository.saveAndFlush(new SchedulerLock(name, until, owner));
                return true;
            } catch (DataIntegrityViolationException e) {
                return false; // boshqa instansiya bir vaqtda yaratib qo'ydi
            }
        });
        return Boolean.TRUE.equals(acquired);
    }

    /** O'z qulfini bo'shatadi (muddatni o'tganga suradi). */
    public void release(String name) {
        LocalDateTime releasedAt = LocalDateTime.now().minusSeconds(1);
        requiresNew.executeWithoutResult(status -> repository.release(name, owner, releasedAt));
    }

    /**
     * Vazifani qulf ostida bajaradi. Qulf olinmasa vazifa TASHLAB KETILADI — boshqa
     * instansiya bajarayotgan bo'ladi.
     *
     * @return true — bajarildi; false — o'tkazib yuborildi
     */
    public boolean runExclusively(String name, Duration ttl, Runnable task) {
        if (!tryAcquire(name, ttl)) {
            log.info("Vazifa '{}' o'tkazib yuborildi — qulf band (boshqa instansiya bajaryapti)", name);
            return false;
        }
        try {
            task.run();
        } finally {
            release(name);
        }
        return true;
    }

    private static String resolveOwner() {
        String host;
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            host = "unknown";
        }
        String id = host + ":" + ProcessHandle.current().pid();
        return id.length() > 100 ? id.substring(0, 100) : id;
    }
}
