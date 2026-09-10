package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInItemRequest {

    /**
     * B/U mahsulot kartochkasi.
     *
     * <p>Yangi shina kartochkasi berilmasligi kerak: kirim tannarxni "oxirgi
     * kirim narxi" bo'yicha yangilaydi va yangi shinaning tannarxi baholangan
     * summagacha tushib ketardi.
     */
    @NotNull(message = "Mahsulot tanlanishi shart")
    private Long productId;

    @NotNull(message = "Miqdor kiritilishi shart")
    @Min(value = 1, message = "Miqdor kamida 1 bo'lishi kerak")
    private Integer quantity;

    @NotNull(message = "Baho kiritilishi shart")
    @DecimalMin(value = "0", message = "Baho manfiy bo'lmasligi kerak")
    private BigDecimal unitValue;

    @Size(max = 200, message = "Holat izohi 200 belgidan oshmasligi kerak")
    private String conditionNote;
}
