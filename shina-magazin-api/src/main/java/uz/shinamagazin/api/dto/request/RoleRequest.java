package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleRequest {

    @NotBlank(message = "Rol nomi bo'sh bo'lishi mumkin emas")
    @Size(min = 2, max = 100, message = "Rol nomi 2-100 belgidan iborat bo'lishi kerak")
    private String name;

    @NotBlank(message = "Rol kodi bo'sh bo'lishi mumkin emas")
    @Size(min = 2, max = 50, message = "Rol kodi 2-50 belgidan iborat bo'lishi kerak")
    @Pattern(regexp = "^[A-Z][A-Z0-9_]*$", message = "Rol kodi katta harflar va raqamlardan iborat bo'lishi kerak (masalan: CUSTOM_ROLE)")
    private String code;

    @Size(max = 500, message = "Tavsif 500 belgidan oshmasligi kerak")
    private String description;

    private Set<String> permissions;
}
