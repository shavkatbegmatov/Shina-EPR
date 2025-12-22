package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.CustomerType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRequest {

    @NotBlank(message = "Ism familiya kiritilishi shart")
    @Size(max = 150, message = "Ism familiya 150 ta belgidan oshmasligi kerak")
    private String fullName;

    @NotBlank(message = "Telefon raqam kiritilishi shart")
    @Pattern(regexp = "^\\+998[0-9]{9}$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String phone;

    @Pattern(regexp = "^(\\+998[0-9]{9})?$", message = "Telefon raqam formati: +998XXXXXXXXX")
    private String phone2;

    @Size(max = 300, message = "Manzil 300 ta belgidan oshmasligi kerak")
    private String address;

    @Size(max = 200, message = "Kompaniya nomi 200 ta belgidan oshmasligi kerak")
    private String companyName;

    private CustomerType customerType = CustomerType.INDIVIDUAL;

    @Size(max = 500, message = "Izoh 500 ta belgidan oshmasligi kerak")
    private String notes;
}
