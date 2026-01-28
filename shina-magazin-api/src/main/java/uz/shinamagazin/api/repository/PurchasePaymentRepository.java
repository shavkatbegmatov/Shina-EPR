package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.PurchasePayment;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PurchasePaymentRepository extends JpaRepository<PurchasePayment, Long> {

    List<PurchasePayment> findByPurchaseOrderIdOrderByPaymentDateDesc(Long purchaseOrderId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PurchasePayment p WHERE p.purchaseOrder.id = :purchaseOrderId")
    BigDecimal sumByPurchaseOrderId(Long purchaseOrderId);

    long countByPurchaseOrderId(Long purchaseOrderId);
}
