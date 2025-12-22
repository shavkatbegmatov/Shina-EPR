package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleResponse {
    private Long id;
    private String invoiceNumber;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private LocalDateTime saleDate;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal discountPercent;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal debtAmount;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private SaleStatus status;
    private String notes;
    private String createdByName;
    private List<SaleItemResponse> items;

    public static SaleResponse from(Sale sale) {
        return SaleResponse.builder()
                .id(sale.getId())
                .invoiceNumber(sale.getInvoiceNumber())
                .customerId(sale.getCustomer() != null ? sale.getCustomer().getId() : null)
                .customerName(sale.getCustomer() != null ? sale.getCustomer().getFullName() : "Noma'lum")
                .customerPhone(sale.getCustomer() != null ? sale.getCustomer().getPhone() : null)
                .saleDate(sale.getSaleDate())
                .subtotal(sale.getSubtotal())
                .discountAmount(sale.getDiscountAmount())
                .discountPercent(sale.getDiscountPercent())
                .totalAmount(sale.getTotalAmount())
                .paidAmount(sale.getPaidAmount())
                .debtAmount(sale.getDebtAmount())
                .paymentMethod(sale.getPaymentMethod())
                .paymentStatus(sale.getPaymentStatus())
                .status(sale.getStatus())
                .notes(sale.getNotes())
                .createdByName(sale.getCreatedBy() != null ? sale.getCreatedBy().getFullName() : null)
                .items(sale.getItems() != null ?
                        sale.getItems().stream()
                                .map(SaleItemResponse::from)
                                .collect(Collectors.toList()) : null)
                .build();
    }
}
