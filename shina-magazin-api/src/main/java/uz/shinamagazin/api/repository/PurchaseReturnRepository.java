package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.PurchaseReturn;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, Long> {

    List<PurchaseReturn> findByPurchaseOrderIdOrderByReturnDateDesc(Long purchaseOrderId);

    Page<PurchaseReturn> findByStatusOrderByCreatedAtDesc(PurchaseReturnStatus status, Pageable pageable);

    Page<PurchaseReturn> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<PurchaseReturn> findByReturnNumber(String returnNumber);

    long countByStatus(PurchaseReturnStatus status);

    @Query("SELECT MAX(CAST(SUBSTRING(r.returnNumber, 4) AS integer)) FROM PurchaseReturn r WHERE r.returnNumber LIKE :prefix%")
    Integer findMaxReturnNumber(String prefix);
}
