package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.AttributeType;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttributeRequest {

    @NotBlank(message = "Atribut nomi kiritilishi shart")
    @Size(max = 120, message = "Nomi 120 ta belgidan oshmasligi kerak")
    private String name;

    // Bo'sh qoldirilsa nomdan avtomatik slug yasaladi
    @Size(max = 60, message = "Kod 60 ta belgidan oshmasligi kerak")
    @Pattern(regexp = "^[a-z0-9_]*$", message = "Kod faqat kichik lotin harflari, raqam va _ dan iborat bo'lishi kerak")
    private String code;

    @NotNull(message = "Atribut turi kiritilishi shart")
    private AttributeType type;

    @Size(max = 20, message = "Birlik 20 ta belgidan oshmasligi kerak")
    private String unit;

    @Builder.Default
    private Boolean filterable = true;

    @Builder.Default
    private Integer sortOrder = 0;

    @Valid
    @Builder.Default
    private List<OptionRequest> options = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionRequest {
        // Mavjud variantni yangilashda id keladi; yangi variantda null
        private Long id;

        @NotBlank(message = "Variant qiymati bo'sh bo'lmasligi kerak")
        @Size(max = 120, message = "Variant 120 ta belgidan oshmasligi kerak")
        private String value;

        @Builder.Default
        private Integer sortOrder = 0;
    }
}
