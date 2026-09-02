package uz.shinamagazin.api.scheduler;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.repository.StaffNotificationRepository;
import uz.shinamagazin.api.service.SchedulerLockService;
import uz.shinamagazin.api.service.StaffNotificationService;
import uz.shinamagazin.api.service.TelegramNotifier;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Qarz eslatmalari: kuniga bir marta, qulf ostida, Telegram xulosasi tranzaksiyadan keyin.
 */
class DebtReminderSchedulerTest {

    private DebtRepository debtRepository;
    private StaffNotificationService notificationService;
    private StaffNotificationRepository notificationRepository;
    private TelegramNotifier telegramNotifier;
    private SchedulerLockService lockService;
    private DebtReminderScheduler scheduler;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        debtRepository = mock(DebtRepository.class);
        notificationService = mock(StaffNotificationService.class);
        notificationRepository = mock(StaffNotificationRepository.class);
        telegramNotifier = mock(TelegramNotifier.class);
        lockService = mock(SchedulerLockService.class);

        TransactionTemplate tx = mock(TransactionTemplate.class);
        when(tx.execute(any())).thenAnswer(inv ->
                ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(mock(TransactionStatus.class)));

        // Qulf olindi — vazifa bajariladi
        when(lockService.runExclusively(anyString(), any(), any())).thenAnswer(inv -> {
            ((Runnable) inv.getArgument(2)).run();
            return true;
        });

        scheduler = new DebtReminderScheduler(debtRepository, notificationService,
                notificationRepository, telegramNotifier, lockService, tx);
    }

    private static Debt debt(long id, String customerName, String amount, LocalDate due) {
        Customer customer = mock(Customer.class);
        when(customer.getFullName()).thenReturn(customerName);
        Debt debt = mock(Debt.class);
        when(debt.getId()).thenReturn(id);
        when(debt.getCustomer()).thenReturn(customer);
        when(debt.getRemainingAmount()).thenReturn(new BigDecimal(amount));
        when(debt.getDueDate()).thenReturn(due);
        return debt;
    }

    @Test
    @DisplayName("Bugun eslatilgan qarz qayta eslatilmaydi (idempotent), xulosa bir marta ketadi")
    void skipsDebtsAlreadyNotifiedToday() {
        LocalDate today = LocalDate.now();
        Debt fresh = debt(1L, "Ali", "500000", today.plusDays(1));
        Debt notified = debt(2L, "Vali", "300000", today.plusDays(2));
        when(debtRepository.findDebtsWithUpcomingDueDate(any(), any())).thenReturn(List.of(fresh, notified));
        when(notificationRepository.existsByReferenceTypeAndReferenceIdAndCreatedAtGreaterThanEqual(
                eq("DEBT"), eq(2L), any(LocalDateTime.class))).thenReturn(true);

        scheduler.sendDebtReminders();

        verify(notificationService, times(1)).notifyDebtReminder(eq("Ali"), anyString(), anyInt(), eq(1L));
        verify(notificationService, never()).notifyDebtReminder(eq("Vali"), anyString(), anyInt(), anyLong());
        verify(telegramNotifier, times(1)).send(any());
    }

    @Test
    @DisplayName("Qulf band bo'lsa (boshqa instansiya bajaryapti) hech narsa yuborilmaydi")
    void doesNothingWhenLockIsHeldElsewhere() {
        // doReturn: `when(mock.call(...))` mock'ni chaqirib, setUp'dagi answer'ni null Runnable bilan yurgizardi
        doReturn(false).when(lockService).runExclusively(anyString(), any(), any());

        scheduler.sendDebtReminders();
        scheduler.sendOverdueDebtWarnings();

        verify(debtRepository, never()).findDebtsWithUpcomingDueDate(any(), any());
        verify(debtRepository, never()).findOverdueDebts(any());
        verify(telegramNotifier, never()).send(any());
    }

    @Test
    @DisplayName("Muddati o'tgan qarzlar ham kuniga bir marta ogohlantiriladi")
    void overdueWarningsAreIdempotentPerDay() {
        LocalDate today = LocalDate.now();
        Debt overdue = debt(7L, "Sardor", "900000", today.minusDays(5));
        when(debtRepository.findOverdueDebts(any())).thenReturn(List.of(overdue));
        when(notificationRepository.existsByReferenceTypeAndReferenceIdAndCreatedAtGreaterThanEqual(
                eq("DEBT"), eq(7L), any(LocalDateTime.class))).thenReturn(true);

        scheduler.sendOverdueDebtWarnings();

        verify(notificationService, never()).createGlobalNotification(anyString(), anyString(), any(), anyString(), anyLong());
        verify(telegramNotifier, times(1)).send(any());
    }
}
