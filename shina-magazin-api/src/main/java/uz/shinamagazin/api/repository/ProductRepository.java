package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
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

    // ProductResponse/CatalogProductResponse brand va category'ga tegadi (ikkalasi
    // LAZY). Grafiksiz 20 mahsulotli sahifa 40 ta qo'shimcha so'rov qilardi —
    // bu ommaviy katalogning eng issiq yo'li.

    @Override
    @EntityGraph(attributePaths = {"brand", "category"})
    Page<Product> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"brand", "category"})
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"brand", "category"})
    List<Product> findByActiveTrue();

    @EntityGraph(attributePaths = {"brand", "category"})
    Page<Product> findByActiveTrue(Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.active = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(p.brand.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    @EntityGraph(attributePaths = {"brand", "category"})
    Page<Product> searchProducts(@Param("search") String search, Pageable pageable);

    // Eslatma: filtrlash endi ProductSpecs (JpaSpecificationExecutor) orqali —
    // kategoriya shajarasi va atribut filtrlarini bitta dvijok qamrab oladi.

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity <= p.minStockLevel")
    @EntityGraph(attributePaths = {"brand", "category"})
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

    /**
     * Brend facetlari — mahsulot soni bilan.
     *
     * <p>Ilgari brend ro'yxati vitrinaga yuklangan mahsulotlardan qurilardi:
     * birinchi sahifada mahsuloti yo'q brend tanlagichda UMUMAN ko'rinmasdi.
     */
    @Query("""
            SELECT b.id, b.name, COUNT(p) FROM Product p
            JOIN p.brand b
            WHERE p.active = true
              AND (:allCategories = true OR p.category.id IN (:categoryIds))
            GROUP BY b.id, b.name
            ORDER BY b.name""")
    List<Object[]> brandFacets(@Param("allCategories") boolean allCategories,
                               @Param("categoryIds") List<Long> categoryIds);

    // ─── O'lcham facetlari (o'lcham tanlagich ro'yxatlari) ───
    // Ilgari tanlagich ro'yxatlari vitrinaga yuklangan birinchi 200 mahsulotdan
    // qurilardi, ya'ni katalog kattaroq bo'lsa ba'zi o'lchamlar umuman
    // taklif qilinmasdi. Endi ular butun katalogdan olinadi.

    @Query("""
            SELECT DISTINCT p.width FROM Product p
            WHERE p.active = true AND p.width IS NOT NULL
              AND (:allCategories = true OR p.category.id IN (:categoryIds))
            ORDER BY p.width""")
    List<Integer> distinctWidths(@Param("allCategories") boolean allCategories,
                                 @Param("categoryIds") List<Long> categoryIds);

    @Query("""
            SELECT DISTINCT p.profile FROM Product p
            WHERE p.active = true AND p.profile IS NOT NULL
              AND (:allCategories = true OR p.category.id IN (:categoryIds))
            ORDER BY p.profile""")
    List<Integer> distinctProfiles(@Param("allCategories") boolean allCategories,
                                   @Param("categoryIds") List<Long> categoryIds);

    @Query("""
            SELECT DISTINCT p.diameter FROM Product p
            WHERE p.active = true AND p.diameter IS NOT NULL
              AND (:allCategories = true OR p.category.id IN (:categoryIds))
            ORDER BY p.diameter""")
    List<Integer> distinctDiameters(@Param("allCategories") boolean allCategories,
                                    @Param("categoryIds") List<Long> categoryIds);

    @EntityGraph(attributePaths = {"brand", "category"})
    List<Product> findByBrandIdAndActiveTrue(Long brandId);

    @EntityGraph(attributePaths = {"brand", "category"})
    List<Product> findByCategoryIdAndActiveTrue(Long categoryId);
}
