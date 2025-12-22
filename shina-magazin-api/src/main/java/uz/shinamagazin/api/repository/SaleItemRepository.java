package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.SaleItem;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    List<SaleItem> findBySaleId(Long saleId);

    @Query("SELECT si.product.id, si.product.name, SUM(si.quantity) as totalQty " +
            "FROM SaleItem si " +
            "WHERE si.sale.saleDate >= :start AND si.sale.saleDate < :end " +
            "AND si.sale.status = 'COMPLETED' " +
            "GROUP BY si.product.id, si.product.name " +
            "ORDER BY totalQty DESC")
    List<Object[]> findTopSellingProducts(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
}
