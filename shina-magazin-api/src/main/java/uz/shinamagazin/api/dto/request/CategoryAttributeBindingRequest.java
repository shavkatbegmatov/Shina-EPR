package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kategoriyaga atribut biriktirish yozuvi (PUT /v1/categories/{id}/attributes
 * to'liq ro'yxatni almashtiradi).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttributeBindingRequest {

    @NotNull(message = "attributeId kiritilishi shart")
    private Long attributeId;

    @Builder.Default
    private Boolean required = false;

    @Builder.Default
    private Integer sortOrder = 0;
}
