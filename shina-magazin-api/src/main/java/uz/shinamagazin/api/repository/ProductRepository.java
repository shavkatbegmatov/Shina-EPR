package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySku(String sku);

    boolean existsBySku(String sku);

    List<Product> findByActiveTrue();

    Page<Product> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.active = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.brand.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Product> searchProducts(@Param("search") String search, Pageable pageable);

    // Eslatma: filtrlash endi ProductSpecs (JpaSpecificationExecutor) orqali —
    // kategoriya shajarasi va atribut filtrlarini bitta dvijok qamrab oladi.

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity <= p.minStockLevel")
    List<Product> findLowStockProducts();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.active = true")
    long countActiveProducts();

    // Kategoriya bo'yicha faol mahsulotlar soni (admin daraxti va facetlar uchun)
    @Query("SELECT p.category.id, COUNT(p) FROM Product p WHERE p.active = true AND p.category IS NOT NULL GROUP BY p.category.id")
    List<Object[]> countActiveByCategory();

    @Query("SELECT MIN(p.sellingPrice), MAX(p.sellingPrice) FROM Product p WHERE p.active = true " +
            "AND (:allCategories = true OR p.category.id IN (:categoryIds))")
    List<Object[]> priceRange(@Param("allCategories") boolean allCategories,
                              @Param("categoryIds") List<Long> categoryIds);

    @Query("SELECT SUM(p.quantity) FROM Product p WHERE p.active = true")
    Long getTotalStock();

    List<Product> findByBrandIdAndActiveTrue(Long brandId);

    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);
}
