package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    private String name;

    @NotBlank
    private String phone;

    private String email;

    @NotNull
    private ShopDeliveryMethod deliveryMethod;

    private String address;

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
