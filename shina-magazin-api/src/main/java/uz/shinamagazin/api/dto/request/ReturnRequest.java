package uz.shinamagazin.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequest {

    @NotNull(message = "Qaytarish sanasi kiritilishi shart")
    private LocalDate returnDate;

    @NotBlank(message = "Qaytarish sababi kiritilishi shart")
    private String reason;

    @NotEmpty(message = "Kamida bitta mahsulot tanlanishi kerak")
    @Valid
    private List<ReturnItemRequest> items;
}
