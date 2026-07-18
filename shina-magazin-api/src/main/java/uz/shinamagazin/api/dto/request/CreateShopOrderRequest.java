package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.shinamagazin.api.enums.ShopDeliveryMethod;
import uz.shinamagazin.api.enums.ShopPaymentMethod;

import java.util.List;

/** Storefront buyurtma yaratish so'rovi (guest checkout). Narx serverda hisoblanadi. */
@Data
public class CreateShopOrderRequest {

    @NotEmpty
    @Valid
    private List<Item> items;

    @NotBlank(message = "Ism familiya kiritilishi shart")
    @Size(max = 120, message = "Ism familiya 120 ta belgidan oshmasligi kerak")
    private String name;

    @NotBlank(message = "Telefon raqam kiritilishi shart")
    @Pattern(regexp = "^[+()0-9\\s-]{9,30}$", message = "Telefon raqam formati noto'g'ri")
    private String phone;

    @Email(message = "Email formati noto'g'ri")
    @Size(max = 120, message = "Email 120 ta belgidan oshmasligi kerak")
    private String email;

    @NotNull
    private ShopDeliveryMethod deliveryMethod;

    @Size(max = 300, message = "Manzil 300 ta belgidan oshmasligi kerak")
    private String address;

    @Size(max = 500, message = "Izoh 500 ta belgidan oshmasligi kerak")
    private String note;

    @NotNull
    private ShopPaymentMethod payment;

    @Data
    public static class Item {
        @NotNull
        private Long productId;

        @NotNull
        @Min(1)
        private Integer quantity;
    }
}
