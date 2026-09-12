package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Eski shinalarni savdodan ALOHIDA qabul qilish (Barter sahifasi).
 *
 * <p>Mijoz shinasini bugun qoldirib, xaridni keyinroq qiladi. Kassada
 * savdo ichida qabul qilish uchun bu so'rov kerak emas — POS barter
 * qatorlarini {@code POST /v1/sales} ga qo'shib yuboradi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeInRequest {

    /** Eski shinalar kimdan olingani hujjatda qolishi shart. */
    @NotNull(message = "Barter uchun mijoz tanlash shart")
    private Long customerId;

    @NotEmpty(message = "Qabul qilinadigan shinalar ro'yxati bo'sh bo'lmasligi kerak")
    @Valid
    private List<TradeInItemRequest> items;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String notes;
}
