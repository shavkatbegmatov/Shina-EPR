package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/** Smena ochish — kassadagi boshlang'ich mayda pul. */
@Data
public class OpenShiftRequest {

    @NotNull(message = "Boshlang'ich qoldiq ko'rsatilishi shart")
    @DecimalMin(value = "0.0", message = "Boshlang'ich qoldiq manfiy bo'lishi mumkin emas")
    private BigDecimal openingFloat;
}
