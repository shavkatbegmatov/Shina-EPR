package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SettingsUpdateRequest {

    @NotNull(message = "Qarz muddati kunlarda ko'rsatilishi shart")
    @Min(value = 1, message = "Qarz muddati kamida 1 kun bo'lishi kerak")
    @Max(value = 365, message = "Qarz muddati 365 kundan oshmasligi kerak")
    private Integer debtDueDays;
}
