package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface StaffRegistrationRequestRepository
        extends JpaRepository<StaffRegistrationRequest, Long> {

    Page<StaffRegistrationRequest> findByStatusOrderByCreatedAtDesc(
            StaffRegistrationStatus status, Pageable pageable);

    Page<StaffRegistrationRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Bir raqamdan bir vaqtda faqat bitta kutilayotgan so'rov (bazada ham unique index bor). */
    boolean existsByPhoneAndStatus(String phone, StaffRegistrationStatus status);

    long countByStatus(StaffRegistrationStatus status);

    /** Botdagi `/start staff_<token>` uchun. */
    Optional<StaffRegistrationRequest> findByTelegramLinkToken(String telegramLinkToken);

    /**
     * Ko'rib chiqilgan sanasi bo'yicha eski arizalarni o'chiradi.
     *
     * <p>`reviewedAt` ishlatiladi, `createdAt` emas: hisob ariza berilgan
     * kundan emas, QAROR chiqqan kundan boshlanishi kerak. Uzoq turib
     * qolgan ariza rad etilgan zahoti o'chib ketmasin.
     */
    @Modifying
    @Query("DELETE FROM StaffRegistrationRequest r WHERE r.status = :status AND r.reviewedAt < :cutoff")
    int deleteByStatusAndReviewedAtBefore(@Param("status") StaffRegistrationStatus status,
                                          @Param("cutoff") LocalDateTime cutoff);
}
