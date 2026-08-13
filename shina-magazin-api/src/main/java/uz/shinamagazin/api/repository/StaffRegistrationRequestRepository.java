package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;

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
}
