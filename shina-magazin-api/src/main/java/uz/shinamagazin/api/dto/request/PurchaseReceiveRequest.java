package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Molni sanab qabul qilish ("TEKSHIRILDI").
 *
 * <p>{@code items} bo'sh yoki berilmasa — hamma qator hujjatdagi miqdorda
 * to'liq qabul qilinadi. Berilsa har qator uchun JAMI qabul qilingan miqdor
 * (avvalgi qisman qabul bilan birga) yuboriladi: shu bilan ikkinchi
 * yetkazma ham xuddi shu endpoint orqali rasmiylashtiriladi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseReceiveRequest {

    @Valid
    private List<Line> items;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Line {

        @NotNull(message = "Qator ID kiritilishi shart")
        private Long itemId;

        @NotNull(message = "Qabul qilingan miqdor kiritilishi shart")
        @Min(value = 0, message = "Miqdor manfiy bo'lmasligi kerak")
        private Integer receivedQuantity;
    }
}
