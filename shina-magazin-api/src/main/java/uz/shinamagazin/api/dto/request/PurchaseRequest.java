package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PurchaseCurrency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Kirim hujjati (xarid) so'rovi — ta'minotchi yuk xati shablonida.
 *
 * <p>Narxlar ({@code items[].unitPrice}, {@code items[].bonusPerUnit})
 * HUJJAT VALYUTASIDA keladi; so'mga aylantirishni server {@code exchangeRate}
 * bilan qiladi. {@code paidAmount} va {@code transportCost} esa doim so'mda —
 * bu kassadan chiqqan haqiqiy pul.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequest {

    @NotNull(message = "Ta'minotchi ID kiritilishi shart")
    private Long supplierId;

    @NotNull(message = "Sana kiritilishi shart")
    private LocalDate orderDate;

    @NotEmpty(message = "Mahsulotlar ro'yxati bo'sh bo'lmasligi kerak")
    @Valid
    private List<PurchaseItemRequest> items;

    @NotNull(message = "To'langan summa kiritilishi shart")
    @DecimalMin(value = "0", message = "To'langan summa manfiy bo'lmasligi kerak")
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Size(max = 500, message = "Izoh 500 belgidan oshmasligi kerak")
    private String notes;

    // ─── Ta'minotchi hujjati ───

    /** Hujjat valyutasi; berilmasa UZS. */
    private PurchaseCurrency currency;

    /** 1 birlik hujjat valyutasi = N so'm. UZS bo'lmagan hujjatda majburiy. */
    @DecimalMin(value = "0.0001", message = "Kurs musbat bo'lishi kerak")
    private BigDecimal exchangeRate;

    /** Ta'minotchi hujjat raqami ("Kun ID"). */
    @Size(max = 50, message = "Hujjat raqami 50 belgidan oshmasligi kerak")
    private String supplierDocNumber;

    private LocalDate supplierDocDate;

    /** Yuk mashina raqami / jo'natma. */
    @Size(max = 50, message = "Mashina raqami 50 belgidan oshmasligi kerak")
    private String vehicleNumber;

    /** Yo'l haqi (so'm) — tannarxga taqsimlanadi, ta'minotchi qarziga kirmaydi. */
    @DecimalMin(value = "0", message = "Yo'l haqi manfiy bo'lmasligi kerak")
    @Builder.Default
    private BigDecimal transportCost = BigDecimal.ZERO;

    /**
     * {@code true} (standart) — mol darhol omborga kiradi (eski xatti-harakat).
     * {@code false} — hujjat "kutilmoqda" holatida saqlanadi; mol kelib
     * sanalgach {@code /receive} bilan qabul qilinadi ("TEKSHIRILDI").
     */
    @Builder.Default
    private Boolean receiveNow = Boolean.TRUE;
}
