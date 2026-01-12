package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseReturnResponse {
    private Long id;
    private String returnNumber;
    private Long purchaseOrderId;
    private String purchaseOrderNumber;
    private Long supplierId;
    private String supplierName;
    private LocalDate returnDate;
    private String reason;
    private PurchaseReturnStatus status;
    private BigDecimal refundAmount;
    private List<PurchaseReturnItemResponse> items;
    private String createdByName;
    private String approvedByName;
    private LocalDate approvedAt;
    private LocalDateTime createdAt;
}
