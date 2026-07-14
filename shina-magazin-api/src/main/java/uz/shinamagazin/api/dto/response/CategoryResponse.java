package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Category;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Kategoriyalar", title = "Kategoriyalar Hisoboti")
public class CategoryResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Nomi", order = 2)
    private String name;

    @ExportColumn(header = "Tavsif", order = 3)
    private String description;

    private Long parentId; // Not exported

    @ExportColumn(header = "Asosiy kategoriya", order = 4)
    private String parentName;

    private List<CategoryResponse> children; // Not exported (complex type)

    private String icon; // Lucide ikonka nomi (not exported)

    private Integer sortOrder; // Not exported

    // Shu kategoriyaning O'ZIDAGI faol mahsulotlar soni (bolalarisiz);
    // servicedagi count so'rovi bilan to'ldiriladi, aks holda null qoladi.
    private Long productCount;

    @ExportColumn(header = "Faol", order = 5, type = ColumnType.BOOLEAN)
    private Boolean active;

    public static CategoryResponse from(Category category) {
        return from(category, null);
    }

    /** productCounts — categoryId -> faol mahsulotlar soni (null bo'lsa hisoblanmaydi). */
    public static CategoryResponse from(Category category, java.util.Map<Long, Long> productCounts) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .children(category.getChildren() != null && !category.getChildren().isEmpty() ?
                        category.getChildren().stream()
                                .filter(Category::getActive)
                                .map(child -> CategoryResponse.from(child, productCounts))
                                .collect(Collectors.toList()) : null)
                .icon(category.getIcon())
                .sortOrder(category.getSortOrder())
                .productCount(productCounts != null ? productCounts.getOrDefault(category.getId(), 0L) : null)
                .active(category.getActive())
                .build();
    }
}
