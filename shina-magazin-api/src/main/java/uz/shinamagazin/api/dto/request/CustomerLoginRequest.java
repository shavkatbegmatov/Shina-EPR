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
public class CustomerLoginRequest {

    @NotBlank(message = "Telefon raqam kiritilishi shart")
    @Pattern(regexp = "^\\+998[0-9]{9}$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String phone;

    @NotBlank(message = "PIN kod kiritilishi shart")
    @Size(min = 4, max = 6, message = "PIN kod 4-6 raqamdan iborat bo'lishi kerak")
    @Pattern(regexp = "^[0-9]+$", message = "PIN kod faqat raqamlardan iborat bo'lishi kerak")
    private String pin;
}
