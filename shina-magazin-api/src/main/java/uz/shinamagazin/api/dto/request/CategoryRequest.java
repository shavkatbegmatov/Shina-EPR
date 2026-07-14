package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "Kategoriya nomi kiritilishi shart")
    @Size(max = 100, message = "Nomi 100 ta belgidan oshmasligi kerak")
    private String name;

    @Size(max = 500, message = "Tavsif 500 ta belgidan oshmasligi kerak")
    private String description;

    private Long parentId;

    @Size(max = 50, message = "Ikonka nomi 50 ta belgidan oshmasligi kerak")
    private String icon;

    private Integer sortOrder;

    private Boolean active;
}
