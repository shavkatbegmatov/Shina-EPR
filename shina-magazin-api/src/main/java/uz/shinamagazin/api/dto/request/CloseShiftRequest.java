package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/** Smena yopish — kassir sanagan naqd pul. */
@Data
public class CloseShiftRequest {

    @NotNull(message = "Sanalgan naqd pul ko'rsatilishi shart")
    @DecimalMin(value = "0.0", message = "Sanalgan naqd pul manfiy bo'lishi mumkin emas")
    private BigDecimal countedCash;

    /** Farq bo'lsa sabab (ixtiyoriy). */
    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String notes;
}
