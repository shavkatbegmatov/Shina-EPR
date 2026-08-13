package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CloseShiftRequest;
import uz.shinamagazin.api.dto.request.OpenShiftRequest;
import uz.shinamagazin.api.dto.response.CashShiftResponse;
import uz.shinamagazin.api.dto.response.ZReportResponse;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.CashShiftStatus;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CashShiftRepository;
import uz.shinamagazin.api.repository.ExpenseRepository;
import uz.shinamagazin.api.repository.SaleReturnRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Kassa smenasi va Z-hisobot.
 *
 * <p>Muammo shu edi: kassir kun oxirida qancha pul topshirishi kerakligini
 * tizim bilmasdi. Savdolar bor, lekin boshlang'ich kassa qoldig'i, naqd tushum
 * va sanab topshirilgan pul hech qayerda solishtirilmasdi — kamomad sezilmay
 * qolardi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CashShiftService {

    private final CashShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final SaleReturnRepository saleReturnRepository;
    private final ExpenseRepository expenseRepository;

    /** Kassirning ochiq smenasi (bo'lmasa bo'sh). */
    @Transactional(readOnly = true)
    public Optional<CashShift> findOpenShift(Long userId) {
        return shiftRepository.findByOpenedByIdAndStatus(userId, CashShiftStatus.OPEN);
    }

    @Transactional(readOnly = true)
    public Optional<CashShiftResponse> getCurrentShift(Long userId) {
        return findOpenShift(userId).map(CashShiftResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<CashShiftResponse> getShifts(Pageable pageable) {
        return shiftRepository.findAllByOrderByOpenedAtDesc(pageable).map(CashShiftResponse::from);
    }

    @Transactional
    public CashShiftResponse openShift(Long userId, OpenShiftRequest request) {
        if (findOpenShift(userId).isPresent()) {
            throw new BadRequestException("Sizda allaqachon ochiq smena bor. Avval uni yoping.");
        }

        User cashier = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        CashShift shift = CashShift.builder()
                .openedBy(cashier)
                .openedAt(LocalDateTime.now())
                .openingFloat(request.getOpeningFloat())
                .status(CashShiftStatus.OPEN)
                .build();

        try {
            shift = shiftRepository.saveAndFlush(shift);
        } catch (DataIntegrityViolationException e) {
            // Qisman unikal indeks (uq_cash_shift_open_per_user) — ikkita
            // parallel "ochish" so'rovidan biri shu yerga tushadi.
            throw new BadRequestException("Sizda allaqachon ochiq smena bor. Avval uni yoping.");
        }

        log.info("Kassa smenasi ochildi: id={}, kassir={}, qoldiq={}",
                shift.getId(), cashier.getUsername(), shift.getOpeningFloat());
        return CashShiftResponse.from(shift);
    }

    @Transactional
    public ZReportResponse closeShift(Long userId, CloseShiftRequest request) {
        CashShift shift = findOpenShift(userId)
                .orElseThrow(() -> new BadRequestException("Ochiq smena topilmadi"));

        ZReportResponse report = buildReport(shift);

        User closedBy = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        // expectedCash va difference ATAYLAB saqlanadi: keyinchalik savdo bekor
        // qilinsa ham hisobot o'sha paytdagi haqiqatni ko'rsatishi kerak, aks
        // holda kamomad "o'z-o'zidan yo'qolardi".
        shift.setClosedBy(closedBy);
        shift.setClosedAt(LocalDateTime.now());
        shift.setCountedCash(request.getCountedCash());
        shift.setExpectedCash(report.getExpectedCash());
        shift.setDifference(request.getCountedCash().subtract(report.getExpectedCash()));
        shift.setStatus(CashShiftStatus.CLOSED);
        shift.setNotes(request.getNotes());
        shiftRepository.save(shift);

        if (shift.getDifference().signum() != 0) {
            log.warn("Smena {} yopildi, FARQ bilan: kutilgan={}, sanalgan={}, farq={}",
                    shift.getId(), report.getExpectedCash(), request.getCountedCash(), shift.getDifference());
        } else {
            log.info("Smena {} yopildi, farqsiz ({})", shift.getId(), request.getCountedCash());
        }

        // Yopilgandan keyingi holat bilan qayta quramiz (countedCash/difference bilan)
        return buildReport(shift);
    }

    @Transactional(readOnly = true)
    public ZReportResponse getReport(Long shiftId) {
        CashShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Smena", "id", shiftId));
        return buildReport(shift);
    }

    /**
     * Z-hisobotni yig'adi.
     *
     * <p>Naqd hisobida faqat {@link PaymentMethod#CASH} savdolarning
     * TO'LANGAN qismi ({@code paidAmount}) hisobga olinadi: qarzga sotilgan
     * qism kassaga tushmagan. MIXED alohida ko'rsatiladi, lekin naqdga
     * qo'shilmaydi — uning naqd/karta nisbati saqlanmaydi, taxmin qilish esa
     * kamomad hisobini buzardi.
     */
    private ZReportResponse buildReport(CashShift shift) {
        List<ZReportResponse.PaymentBreakdown> breakdown = new ArrayList<>();
        long salesCount = 0;
        BigDecimal grossTotal = BigDecimal.ZERO;
        BigDecimal cashReceived = BigDecimal.ZERO;

        for (Object[] row : shiftRepository.summarizeByPaymentMethod(shift.getId())) {
            PaymentMethod method = (PaymentMethod) row[0];
            long count = ((Number) row[1]).longValue();
            BigDecimal total = (BigDecimal) row[2];
            BigDecimal paid = (BigDecimal) row[3];

            salesCount += count;
            grossTotal = grossTotal.add(total);
            if (method == PaymentMethod.CASH) {
                cashReceived = cashReceived.add(paid);
            }

            breakdown.add(ZReportResponse.PaymentBreakdown.builder()
                    .method(method).count(count).total(total).paid(paid).build());
        }

        // Qaytarishlarda va naqd xarajatlarda kassadan chiqqan pul AYIRILADI —
        // aks holda kassa kam chiqib, kassirga asossiz kamomad yozilardi.
        BigDecimal cashRefunded = saleReturnRepository.sumCashRefundedByShift(shift.getId());
        // NAQD va shu smenadagi savdoning qaytarimi `paidAmount` orqali
        // `cashReceived` da allaqachon aks etgan (createReturn uni kamaytiradi).
        // Uni yana ayirish qaytarimni IKKI MARTA hisoblab, halol kassirga soxta
        // "ortiqcha", insofsiziga esa aynan shu summadagi o'g'irlikka niqob
        // berardi. Shu qism qaytarib qo'shiladi; cashRefunded esa hisobotda
        // to'liq ko'rsatilaveradi.
        BigDecimal refundsNettedInPaid = saleReturnRepository.sumCashRefundedNettedInPaid(shift.getId());
        BigDecimal cashExpenses = expenseRepository.sumCashByShift(shift.getId());
        BigDecimal expectedCash = shift.getOpeningFloat()
                .add(cashReceived)
                .subtract(cashRefunded)
                .add(refundsNettedInPaid)
                .subtract(cashExpenses);

        return ZReportResponse.builder()
                .shift(CashShiftResponse.from(shift))
                .salesCount(salesCount)
                .cancelledCount(shiftRepository.countCancelled(shift.getId()))
                .grossTotal(grossTotal)
                .debtIssued(shiftRepository.sumDebtIssued(shift.getId()))
                .byPaymentMethod(breakdown)
                .openingFloat(shift.getOpeningFloat())
                .cashReceived(cashReceived)
                .cashRefunded(cashRefunded)
                .returnsCount(saleReturnRepository.countByShift(shift.getId()))
                .cashExpenses(cashExpenses)
                .expensesCount(expenseRepository.countByShift(shift.getId()))
                .expectedCash(expectedCash)
                .countedCash(shift.getCountedCash())
                .difference(shift.getDifference())
                .build();
    }
}
