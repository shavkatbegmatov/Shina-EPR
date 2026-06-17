package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.ShopOrder;

import java.util.Optional;

@Repository
public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {
    Optional<ShopOrder> findByOrderNo(String orderNo);
    boolean existsByOrderNo(String orderNo);
}
