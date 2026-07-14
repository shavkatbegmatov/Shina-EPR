package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.ProductAttributeValue;

import java.util.List;

@Repository
public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Long> {

    @Query("SELECT v FROM ProductAttributeValue v " +
            "JOIN FETCH v.attribute a LEFT JOIN FETCH v.option " +
            "WHERE v.product.id = :productId " +
            "ORDER BY a.sortOrder ASC, a.id ASC, v.id ASC")
    List<ProductAttributeValue> findByProductIdWithAttribute(@Param("productId") Long productId);

    @Modifying
    @Query("DELETE FROM ProductAttributeValue v WHERE v.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);

    @Query("SELECT COUNT(v) FROM ProductAttributeValue v WHERE v.attribute.id = :attributeId")
    long countByAttributeId(@Param("attributeId") Long attributeId);

    @Query("SELECT COUNT(v) FROM ProductAttributeValue v WHERE v.option.id = :optionId")
    long countByOptionId(@Param("optionId") Long optionId);

    // Facet hisoblagichlari: berilgan mahsulot to'plamida har bir variant nechta faol mahsulotda uchraydi
    @Query("SELECT v.option.id, COUNT(DISTINCT v.product.id) FROM ProductAttributeValue v " +
            "WHERE v.product.active = true AND v.option IS NOT NULL " +
            "AND (:allCategories = true OR v.product.category.id IN (:categoryIds)) " +
            "GROUP BY v.option.id")
    List<Object[]> countProductsByOption(@Param("allCategories") boolean allCategories,
                                         @Param("categoryIds") List<Long> categoryIds);
}
