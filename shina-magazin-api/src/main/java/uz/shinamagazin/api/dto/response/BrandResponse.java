package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Brand;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Brendlar", title = "Brendlar Hisoboti")
public class BrandResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Nomi", order = 2)
    private String name;

    @ExportColumn(header = "Mamlakat", order = 3)
    private String country;

    private String logoUrl; // Not exported

    @ExportColumn(header = "Faol", order = 4, type = ColumnType.BOOLEAN)
    private Boolean active;

    public static BrandResponse from(Brand brand) {
        return BrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .country(brand.getCountry())
                .logoUrl(brand.getLogoUrl())
                .active(brand.getActive())
                .build();
    }
}
