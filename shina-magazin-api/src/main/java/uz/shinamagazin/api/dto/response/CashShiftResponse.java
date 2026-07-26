package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.enums.CashShiftStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Smena holati (Z-hisobotsiz — u alohida DTO). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashShiftResponse {

    private Long id;
    private String openedByName;
    private LocalDateTime openedAt;
    private BigDecimal openingFloat;
    private String closedByName;
    private LocalDateTime closedAt;
    private BigDecimal countedCash;
    private BigDecimal expectedCash;
    private BigDecimal difference;
    private CashShiftStatus status;
    private String notes;

    public static CashShiftResponse from(CashShift shift) {
        return CashShiftResponse.builder()
                .id(shift.getId())
                .openedByName(shift.getOpenedBy() != null ? shift.getOpenedBy().getFullName() : null)
                .openedAt(shift.getOpenedAt())
                .openingFloat(shift.getOpeningFloat())
                .closedByName(shift.getClosedBy() != null ? shift.getClosedBy().getFullName() : null)
                .closedAt(shift.getClosedAt())
                .countedCash(shift.getCountedCash())
                .expectedCash(shift.getExpectedCash())
                .difference(shift.getDifference())
                .status(shift.getStatus())
                .notes(shift.getNotes())
                .build();
    }
}
