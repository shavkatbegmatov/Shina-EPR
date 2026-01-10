package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private Long id;
    private Long saleId;
    private String invoiceNumber;
    private Long customerId;
    private String customerName;
    private BigDecimal amount;
    private PaymentMethod method;
    private PaymentType paymentType;
    private String referenceNumber;
    private String notes;
    private LocalDateTime paymentDate;
    private String receivedByName;

    public static PaymentResponse from(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .saleId(payment.getSale() != null ? payment.getSale().getId() : null)
                .invoiceNumber(payment.getSale() != null ? payment.getSale().getInvoiceNumber() : null)
                .customerId(payment.getCustomer() != null ? payment.getCustomer().getId() : null)
                .customerName(payment.getCustomer() != null ? payment.getCustomer().getFullName() : null)
                .amount(payment.getAmount())
                .method(payment.getMethod())
                .paymentType(payment.getPaymentType())
                .referenceNumber(payment.getReferenceNumber())
                .notes(payment.getNotes())
                .paymentDate(payment.getPaymentDate())
                .receivedByName(payment.getReceivedBy().getFullName())
                .build();
    }
}
