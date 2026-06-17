package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;

import java.util.Optional;

@Repository
public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {
    Optional<ShopOrder> findByOrderNo(String orderNo);
    boolean existsByOrderNo(String orderNo);

    Page<ShopOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ShopOrder> findByStatusOrderByCreatedAtDesc(ShopOrderStatus status, Pageable pageable);
    long countByStatus(ShopOrderStatus status);
}
