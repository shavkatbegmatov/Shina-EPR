package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.PurchaseReturn;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, Long> {

    List<PurchaseReturn> findByPurchaseOrderIdOrderByReturnDateDesc(Long purchaseOrderId);

    /**
     * Xaridning hali YAKUNLANMAGAN (PENDING/APPROVED) qaytarishlarida band
     * qilingan miqdorlar, mahsulot bo'yicha.
     *
     * <p>Sotuv qaytarishlaridagi {@code returnedQuantitiesBySale} ning
     * ekvivalenti — busiz to'liq miqdorga bir nechta parallel qaytarish
     * yaratib, hammasini yakunlash mumkin edi: {@code receivedQuantity}
     * manfiyga tushar, ta'minotchi balansi esa har biriga alohida
     * kreditlanar edi.
     *
     * <p>COMPLETED sanalmaydi: yakunlangan qaytarish {@code receivedQuantity}
     * ni allaqachon kamaytirgan — yana sanash kvotani ikki marta qisqartirardi.
     * REJECTED/o'chirilganlar ham kvota band qilmaydi.
     */
    @Query("""
            SELECT ri.product.id, COALESCE(SUM(ri.returnedQuantity), 0)
            FROM PurchaseReturnItem ri
            WHERE ri.purchaseReturn.purchaseOrder.id = :purchaseId
              AND ri.purchaseReturn.status IN (
                  uz.shinamagazin.api.enums.PurchaseReturnStatus.PENDING,
                  uz.shinamagazin.api.enums.PurchaseReturnStatus.APPROVED)
            GROUP BY ri.product.id""")
    List<Object[]> sumOutstandingReturnQuantities(@Param("purchaseId") Long purchaseId);

    default Map<Long, Long> outstandingReturnQuantities(Long purchaseId) {
        return sumOutstandingReturnQuantities(purchaseId).stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).longValue()));
    }

    Page<PurchaseReturn> findByStatusOrderByCreatedAtDesc(PurchaseReturnStatus status, Pageable pageable);

    Page<PurchaseReturn> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<PurchaseReturn> findByReturnNumber(String returnNumber);

    long countByStatus(PurchaseReturnStatus status);

    @Query("SELECT MAX(CAST(SUBSTRING(r.returnNumber, 4) AS integer)) FROM PurchaseReturn r WHERE r.returnNumber LIKE :prefix%")
    Integer findMaxReturnNumber(String prefix);
}
