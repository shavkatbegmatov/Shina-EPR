package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.Attribute;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttributeRepository extends JpaRepository<Attribute, Long> {

    List<Attribute> findByActiveTrueOrderBySortOrderAscIdAsc();

    Optional<Attribute> findByCode(String code);

    boolean existsByCode(String code);

    @Query("SELECT DISTINCT a FROM Attribute a LEFT JOIN FETCH a.options WHERE a.active = true ORDER BY a.sortOrder ASC, a.id ASC")
    List<Attribute> findAllActiveWithOptions();
}
