package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.DebtPaymentRequest;
import uz.shinamagazin.api.dto.response.DebtResponse;
import uz.shinamagazin.api.dto.response.PaymentResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.DebtStatus;
import uz.shinamagazin.api.enums.PaymentType;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.repository.PaymentRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DebtService {

    private final DebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;

    public Page<DebtResponse> getAllDebts(DebtStatus status, Pageable pageable) {
        Page<Debt> debts;
        if (status != null) {
            debts = debtRepository.findByStatus(status, pageable);
        } else {
            debts = debtRepository.findAll(pageable);
        }
        return debts.map(DebtResponse::from);
    }

    public List<DebtResponse> getActiveDebts() {
        return debtRepository.findActiveDebts().stream()
                .map(DebtResponse::from)
                .collect(Collectors.toList());
    }

    public List<DebtResponse> getOverdueDebts() {
        return debtRepository.findOverdueDebts(LocalDate.now()).stream()
                .map(DebtResponse::from)
                .collect(Collectors.toList());
    }

    public DebtResponse getDebtById(Long id) {
        Debt debt = debtRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", id));
        return DebtResponse.from(debt);
    }

    public List<DebtResponse> getCustomerDebts(Long customerId) {
        return debtRepository.findByCustomerId(customerId).stream()
                .map(DebtResponse::from)
                .collect(Collectors.toList());
    }

    public List<PaymentResponse> getDebtPayments(Long debtId) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", debtId));

        return paymentRepository.findByCustomerIdAndPaymentType(
                        debt.getCustomer().getId(), PaymentType.DEBT_PAYMENT).stream()
                .map(PaymentResponse::from)
                .collect(Collectors.toList());
    }

    public Page<PaymentResponse> getCustomerPayments(Long customerId, Pageable pageable) {
        return paymentRepository.findByCustomerId(customerId, pageable)
                .map(PaymentResponse::from);
    }

    @Transactional
    public DebtResponse makePayment(Long debtId, DebtPaymentRequest request) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", debtId));

        if (debt.getStatus() == DebtStatus.PAID) {
            throw new BadRequestException("Bu qarz allaqachon to'langan");
        }

        BigDecimal paymentAmount = request.getAmount();
        BigDecimal remainingAmount = debt.getRemainingAmount();

        if (paymentAmount.compareTo(remainingAmount) > 0) {
            throw new BadRequestException(
                    String.format("To'lov summasi qarz qoldig'idan (%s) ko'p bo'lishi mumkin emas",
                            remainingAmount.toString()));
        }

        User currentUser = getCurrentUser();
        Customer customer = debt.getCustomer();

        // Create payment record
        Payment payment = Payment.builder()
                .sale(debt.getSale())
                .customer(customer)
                .amount(paymentAmount)
                .method(request.getMethod())
                .paymentType(PaymentType.DEBT_PAYMENT)
                .referenceNumber(request.getReferenceNumber())
                .notes(request.getNotes())
                .paymentDate(LocalDateTime.now())
                .receivedBy(currentUser)
                .build();
        paymentRepository.save(payment);

        // Update debt
        BigDecimal newRemainingAmount = remainingAmount.subtract(paymentAmount);
        debt.setRemainingAmount(newRemainingAmount);

        if (newRemainingAmount.compareTo(BigDecimal.ZERO) == 0) {
            debt.setStatus(DebtStatus.PAID);
        }

        // Update customer balance
        customer.setBalance(customer.getBalance().add(paymentAmount));
        customerRepository.save(customer);

        // Update sale paid amount if linked
        if (debt.getSale() != null) {
            var sale = debt.getSale();
            sale.setPaidAmount(sale.getPaidAmount().add(paymentAmount));
            sale.setDebtAmount(sale.getDebtAmount().subtract(paymentAmount));
            if (sale.getDebtAmount().compareTo(BigDecimal.ZERO) <= 0) {
                sale.setPaymentStatus(uz.shinamagazin.api.enums.PaymentStatus.PAID);
            }
        }

        return DebtResponse.from(debtRepository.save(debt));
    }

    @Transactional
    public DebtResponse makeFullPayment(Long debtId, DebtPaymentRequest request) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", debtId));

        // Set amount to remaining amount for full payment
        request.setAmount(debt.getRemainingAmount());
        return makePayment(debtId, request);
    }

    public BigDecimal getTotalActiveDebt() {
        return debtRepository.getTotalActiveDebt();
    }

    public BigDecimal getCustomerTotalDebt(Long customerId) {
        return debtRepository.getCustomerTotalDebt(customerId);
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }
}
