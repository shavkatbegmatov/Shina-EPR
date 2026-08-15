package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.DebtFullPaymentRequest;
import uz.shinamagazin.api.dto.request.DebtPaymentRequest;
import uz.shinamagazin.api.dto.response.DebtPaymentStatsResponse;
import uz.shinamagazin.api.dto.response.DebtResponse;
import uz.shinamagazin.api.dto.response.PaymentResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.entity.Payment;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.DebtStatus;
import uz.shinamagazin.api.enums.PaymentType;
import uz.shinamagazin.api.enums.SaleStatus;
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
    private final StaffNotificationService staffNotificationService;
    private final NotificationService customerNotificationService;
    private final CashShiftService cashShiftService;

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

    /**
     * SHU qarzning to'lovlari.
     *
     * <p>Ilgari mijozning BARCHA qarz to'lovlari qaytarilardi: qarz B ning
     * "To'lovlar tarixi" ro'yxatida qarz A ning to'lovi ko'rinib, uning
     * ustidagi qoldiq raqamlariga zid kelardi. To'lov qarzning SOTUVIga
     * bog'langan, shuning uchun filtr shu bo'yicha.
     */
    public List<PaymentResponse> getDebtPayments(Long debtId) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", debtId));

        List<Payment> payments = paymentRepository.findByCustomerIdAndPaymentType(
                debt.getCustomer().getId(), PaymentType.DEBT_PAYMENT);

        // Sotuvsiz qarz (qo'lda kiritilgan) — filtrlash uchun asos yo'q,
        // mijoz bo'yicha ro'yxat qoladi
        if (debt.getSale() == null) {
            return payments.stream().map(PaymentResponse::from).collect(Collectors.toList());
        }

        Long saleId = debt.getSale().getId();
        return payments.stream()
                .filter(p -> p.getSale() != null && saleId.equals(p.getSale().getId()))
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

        if (debt.getStatus() == DebtStatus.CANCELLED) {
            throw new BadRequestException("Bu qarz bekor qilingan — sotuv qaytarilgan yoki bekor qilingan");
        }

        // Fix'dan OLDIN yaratilgan "fantom" qarzlar uchun himoya: qaytarilgan
        // yoki bekor qilingan sotuvning qarzi ACTIVE qolib ketgan bo'lsa ham,
        // uni undirib bo'lmaydi — aks holda do'kon qaytarib olingan tovar
        // uchun pul olib, mijoz balansini ikkinchi marta kreditlaydi.
        Sale linkedSale = debt.getSale();
        if (linkedSale != null && (linkedSale.getStatus() == SaleStatus.REFUNDED
                || linkedSale.getStatus() == SaleStatus.CANCELLED)) {
            throw new BadRequestException(
                    "Bu qarzning sotuvi qaytarilgan yoki bekor qilingan — to'lov qabul qilinmaydi");
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
                // Pul QABUL QILGAN kassirning ochiq smenasiga bog'lanadi —
                // naqd qarz to'lovi aynan shu kassaga tushadi va Z-hisobotda
                // hisobga olinadi. Busiz kassadagi qarz puli hisobotda
                // ko'rinmas, o'zlashtirilsa aniqlanmas edi.
                .shift(cashShiftService.findOpenShift(currentUser.getId()).orElse(null))
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

        // Send notification about payment received
        String formattedAmount = String.format("%,.0f", paymentAmount);

        // Notify staff about payment
        staffNotificationService.notifyPaymentReceived(customer.getFullName(), formattedAmount, debtId);

        // Notify customer about payment
        String amountInfo = formattedAmount + " so'm";
        customerNotificationService.sendPaymentReceived(
                customer.getId(),
                amountInfo,
                "{\"debtId\":" + debtId + ",\"amount\":" + paymentAmount + "}"
        );

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
    /**
     * Qarzni to'liq to'lash — summa qoldiqdan olinadi.
     *
     * <p>Chaqiruvchi summa yubormaydi ({@link DebtFullPaymentRequest} da u
     * umuman yo'q): qoldiq server tomonda o'qiladi, ya'ni sahifa ochilgandan
     * keyin boshqa xodim qisman to'lov qabul qilgan bo'lsa ham, bu yerda
     * ANIQ qoldiq to'lanadi.
     */
    public DebtResponse makeFullPayment(Long debtId, DebtFullPaymentRequest request) {
        Debt debt = debtRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Qarz", "id", debtId));

        DebtPaymentRequest payment = new DebtPaymentRequest();
        payment.setAmount(debt.getRemainingAmount());
        payment.setMethod(request.getMethod());
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setNotes(request.getNotes());

        return makePayment(debtId, payment);
    }

    /**
     * "Bugun/hafta/oy to'landi" — haqiqiy to'lov yozuvlaridan.
     *
     * <p>Ilgari frontend buni PAID qarzlarning {@code createdAt} va
     * {@code originalAmount} idan hisoblardi: bugun undirilgan eski qarz 0
     * ko'rinar, qisman to'lovlar umuman sanalmas, to'liq to'langan qarzning
     * butun summasi esa yaratilgan davriga yozilardi.
     */
    public DebtPaymentStatsResponse getPaymentStats() {
        LocalDate today = LocalDate.now();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        return DebtPaymentStatsResponse.builder()
                .paidToday(paymentRepository.sumDebtPaymentsBetween(today.atStartOfDay(), end))
                .paidThisWeek(paymentRepository.sumDebtPaymentsBetween(
                        today.with(java.time.DayOfWeek.MONDAY).atStartOfDay(), end))
                .paidThisMonth(paymentRepository.sumDebtPaymentsBetween(
                        today.withDayOfMonth(1).atStartOfDay(), end))
                .build();
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
