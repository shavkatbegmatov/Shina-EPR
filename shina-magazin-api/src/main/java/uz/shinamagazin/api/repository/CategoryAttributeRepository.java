package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.CategoryAttribute;

import java.util.List;

@Repository
public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, Long> {

    @Query("SELECT ca FROM CategoryAttribute ca JOIN FETCH ca.attribute a LEFT JOIN FETCH a.options " +
            "WHERE ca.category.id = :categoryId ORDER BY ca.sortOrder ASC, ca.id ASC")
    List<CategoryAttribute> findByCategoryIdWithAttribute(@Param("categoryId") Long categoryId);

    @Query("SELECT ca FROM CategoryAttribute ca JOIN FETCH ca.attribute a LEFT JOIN FETCH a.options " +
            "WHERE ca.category.id IN :categoryIds ORDER BY ca.sortOrder ASC, ca.id ASC")
    List<CategoryAttribute> findByCategoryIdsWithAttribute(@Param("categoryIds") List<Long> categoryIds);

    @Query("SELECT COUNT(ca) FROM CategoryAttribute ca WHERE ca.attribute.id = :attributeId")
    long countByAttributeId(@Param("attributeId") Long attributeId);

    @Modifying
    @Query("DELETE FROM CategoryAttribute ca WHERE ca.category.id = :categoryId")
    void deleteByCategoryId(@Param("categoryId") Long categoryId);
}
