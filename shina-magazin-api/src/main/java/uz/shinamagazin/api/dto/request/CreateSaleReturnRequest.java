package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

/** Savdo qaytarish — qaytariladigan qatorlar va sabab. */
@Data
public class CreateSaleReturnRequest {

    @NotEmpty(message = "Kamida bitta mahsulot tanlanishi kerak")
    @Valid
    private List<Item> items;

    @Size(max = 500, message = "Sabab 500 belgidan oshmasligi kerak")
    private String reason;

    @Data
    public static class Item {
        /** Savdo QATORI id'si (mahsulot id emas — narx shu qatordan olinadi). */
        @NotNull(message = "Savdo qatori ko'rsatilishi shart")
        private Long saleItemId;

        @NotNull(message = "Miqdor ko'rsatilishi shart")
        @Min(value = 1, message = "Miqdor kamida 1 bo'lishi kerak")
        private Integer quantity;
    }
}
