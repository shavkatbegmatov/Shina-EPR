package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.ExpenseRequest;
import uz.shinamagazin.api.dto.response.ExpenseResponse;
import uz.shinamagazin.api.entity.CashShift;
import uz.shinamagazin.api.entity.Expense;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.CashShiftStatus;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.ExpenseRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.time.LocalDate;

/**
 * Do'kon xarajatlari.
 *
 * <p>Naqd xarajat ochiq smenaga bog'lanadi va Z-hisobotda kutilgan naqddan
 * ayiriladi: kassadan pul olib xarajat qilingan bo'lsa, kassirga kamomad
 * yozilmasligi kerak.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CashShiftService cashShiftService;

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> search(LocalDate startDate, LocalDate endDate,
                                        ExpenseCategory category, Pageable pageable) {
        if (startDate.isAfter(endDate)) {
            throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
        }
        return expenseRepository.search(startDate, endDate, category, pageable)
                .map(ExpenseResponse::from);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getById(Long id) {
        return ExpenseResponse.from(find(id));
    }

    @Transactional
    public ExpenseResponse create(Long userId, ExpenseRequest request) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));

        Expense expense = Expense.builder()
                .expenseDate(request.getExpenseDate())
                .category(request.getCategory())
                .amount(request.getAmount())
                .description(request.getDescription())
                .paymentMethod(request.getPaymentMethod())
                .shift(resolveShift(userId, request.getPaymentMethod()))
                .createdBy(currentUser)
                .build();

        expense = expenseRepository.save(expense);
        log.info("Xarajat qo'shildi: id={}, turkum={}, summa={}, usul={}, smena={}",
                expense.getId(), expense.getCategory(), expense.getAmount(),
                expense.getPaymentMethod(),
                expense.getShift() != null ? expense.getShift().getId() : "yo'q");
        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse update(Long id, ExpenseRequest request) {
        Expense expense = find(id);
        requireEditableShift(expense);

        expense.setExpenseDate(request.getExpenseDate());
        expense.setCategory(request.getCategory());
        expense.setAmount(request.getAmount());
        expense.setDescription(request.getDescription());
        expense.setPaymentMethod(request.getPaymentMethod());

        // Naqd bo'lmay qolsa smenadan uziladi — aks holda kassadan chiqmagan
        // pul Z-hisobotda chiqim bo'lib qolardi.
        if (request.getPaymentMethod() != PaymentMethod.CASH) {
            expense.setShift(null);
        }

        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(Long id) {
        Expense expense = find(id);
        requireEditableShift(expense);
        expenseRepository.delete(expense);
        log.info("Xarajat o'chirildi: id={}, summa={}", id, expense.getAmount());
    }

    private Expense find(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarajat", "id", id));
    }

    /**
     * Naqd xarajat ochiq smenaga bog'lanadi. Karta/o'tkazma bilan to'langan
     * xarajat kassaga tegmaydi, shuning uchun smenasiz qoladi.
     */
    private CashShift resolveShift(Long userId, PaymentMethod paymentMethod) {
        if (paymentMethod != PaymentMethod.CASH) {
            return null;
        }
        return cashShiftService.findOpenShift(userId).orElse(null);
    }

    /**
     * Yopilgan smenadagi xarajatni o'zgartirishga yo'l qo'yilmaydi.
     *
     * <p>Z-hisobot yopilishda MUHRLANADI. Keyin xarajat summasi o'zgartirilsa
     * yoki o'chirilsa, o'sha hisobotdagi kutilgan naqd bilan mos kelmay
     * qolardi — kamomadni keyinchalik "tuzatib qo'yish" yo'li ochilardi.
     */
    private void requireEditableShift(Expense expense) {
        CashShift shift = expense.getShift();
        if (shift != null && shift.getStatus() == CashShiftStatus.CLOSED) {
            throw new BadRequestException(
                    "Bu xarajat yopilgan smenaga tegishli — uni o'zgartirib bo'lmaydi. "
                            + "Tuzatish uchun teskari xarajat kiriting.");
        }
    }
}
