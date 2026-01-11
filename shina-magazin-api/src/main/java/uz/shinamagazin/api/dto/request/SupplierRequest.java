package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Email;
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
public class SupplierRequest {

    @NotBlank(message = "Ta'minotchi nomi kiritilishi shart")
    @Size(max = 200, message = "Nomi 200 ta belgidan oshmasligi kerak")
    private String name;

    @Size(max = 100, message = "Mas'ul shaxs ismi 100 ta belgidan oshmasligi kerak")
    private String contactPerson;

    @Size(max = 20, message = "Telefon raqam 20 ta belgidan oshmasligi kerak")
    private String phone;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 100, message = "Email 100 ta belgidan oshmasligi kerak")
    private String email;

    @Size(max = 300, message = "Manzil 300 ta belgidan oshmasligi kerak")
    private String address;

    @Size(max = 500, message = "Bank rekvizitlari 500 ta belgidan oshmasligi kerak")
    private String bankDetails;

    @Size(max = 500, message = "Izoh 500 ta belgidan oshmasligi kerak")
    private String notes;
}
