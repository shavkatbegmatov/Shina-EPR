package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Eski shinalarni qabul qilish (barter).
 *
 * <p>Ikki joydan keladi: alohida "Barter" sahifasidan (mijoz shinasini
 * qoldirib ketadi) va POS'dan savdo ichida (o'sha zahoti ishlatiladi).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInRequest {

    private Long customerId;

    @NotEmpty(message = "Qabul qilinadigan shinalar ro'yxati bo'sh bo'lmasligi kerak")
    @Valid
    private List<TradeInItemRequest> items;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String notes;
}
