package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerSetPinRequest {

    @NotBlank(message = "PIN kod kiritilishi shart")
    @Size(min = 4, max = 6, message = "PIN kod 4-6 raqamdan iborat bo'lishi kerak")
    @Pattern(regexp = "^[0-9]+$", message = "PIN kod faqat raqamlardan iborat bo'lishi kerak")
    private String pin;

    @NotBlank(message = "PIN kodni tasdiqlang")
    private String confirmPin;
}
