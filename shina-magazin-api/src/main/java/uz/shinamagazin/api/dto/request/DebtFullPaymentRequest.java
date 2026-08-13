package uz.shinamagazin.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PaymentMethod;

/**
 * Qarzni TO'LIQ to'lash so'rovi.
 *
 * <p>Bu yerda ATAYLAB {@code amount} yo'q: to'liq to'lovda summa — qarzning
 * qoldig'i, uni server o'zi biladi. Chaqiruvchidan summa so'rash ikki xil
 * xavf tug'dirardi: u qoldiqdan farq qilsa qaysi biri to'g'ri degan savol
 * chiqadi, va sahifa ochilgandan keyin qarz o'zgargan bo'lsa (boshqa xodim
 * qisman to'lov qabul qilgan) eskirgan summa yuborilardi.
 *
 * <p>Ilgari bu endpoint {@link DebtPaymentRequest} ni qabul qilardi, unda
 * esa {@code amount} MAJBURIY edi. Natijada "To'liq to'lash" tugmasi har
 * doim 400 bilan tugardi: frontend summani yubormasdi (to'g'ri qilardi),
 * validatsiya esa uni talab qilardi. Servis baribir uni qoldiq bilan
 * almashtirardi, ya'ni maydon majburiy bo'lib turib, e'tiborga olinmasdi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DebtFullPaymentRequest {

    @NotNull(message = "To'lov usuli tanlanishi shart")
    private PaymentMethod method;

    private String referenceNumber;

    private String notes;
}
