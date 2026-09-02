package uz.shinamagazin.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.repository.StaffNotificationRepository;
import uz.shinamagazin.api.service.SchedulerLockService;
import uz.shinamagazin.api.service.StaffNotificationService;
import uz.shinamagazin.api.service.TelegramNotifier;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

/**
 * Qarz muddati yaqinlashganda avtomatik eslatma yuboradi.
 *
 * <p>Uch narsa ataylab shunday qilingan:
 * <ul>
 *   <li><b>Tranzaksiya.</b> Scheduler ipida open-in-view yo'q: {@code debt.getCustomer()}
 *       tranzaksiyadan tashqarida LazyInitializationException berardi va butun job
 *       yiqilardi. DB ishi {@link TransactionTemplate} ichida, Telegram HTTP chaqiruvi
 *       esa undan TASHQARIDA (ulanishni HTTP kutishi bilan band qilmaslik uchun).</li>
 *   <li><b>Idempotentlik.</b> Bir qarz uchun kuniga bittadan ortiq bildirishnoma yozilmaydi —
 *       qayta ishga tushirish yoki ikkinchi nusxa eslatmalarni ikkilantirmaydi.</li>
 *   <li><b>Qulf.</b> {@link SchedulerLockService}: ikki instansiya bir vaqtda ishga tushsa,
 *       faqat bittasi bajaradi.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DebtReminderScheduler {

    /** Telegram xulosasida ko'rsatiladigan mijozlar soni. */
    private static final int DIGEST_LIMIT = 10;
    private static final Duration LOCK_TTL = Duration.ofMinutes(30);
    private static final String REF_TYPE = "DEBT";

    private final DebtRepository debtRepository;
    private final StaffNotificationService notificationService;
    private final StaffNotificationRepository notificationRepository;
    private final TelegramNotifier telegramNotifier;
    private final SchedulerLockService lockService;
    private final TransactionTemplate transactionTemplate;

    /**
     * Har kuni ertalab soat 9:00 da ishga tushadi
     * Muddati 3 kun ichida tugaydigan qarzlar uchun eslatma yuboradi
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDebtReminders() {
        lockService.runExclusively("debt-reminders", LOCK_TTL, this::runDebtReminders);
    }

    void runDebtReminders() {
        log.info("Starting debt reminder check...");
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(3);
        LocalDateTime since = today.atStartOfDay();

        String digest = transactionTemplate.execute(status -> {
            List<Debt> upcomingDebts = debtRepository.findDebtsWithUpcomingDueDate(today, endDate);
            int sent = 0;
            int skipped = 0;

            for (Debt debt : upcomingDebts) {
                if (alreadyNotifiedToday(debt, since)) {
                    skipped++;
                    continue;
                }
                try {
                    long daysLeft = ChronoUnit.DAYS.between(today, debt.getDueDate());
                    notificationService.notifyDebtReminder(
                            debt.getCustomer().getFullName(),
                            formatAmount(debt.getRemainingAmount()),
                            (int) daysLeft,
                            debt.getId());
                    sent++;
                } catch (Exception e) {
                    log.error("Failed to send reminder for debt ID: {}", debt.getId(), e);
                }
            }

            log.info("Debt reminders: {} found, {} sent, {} already notified today",
                    upcomingDebts.size(), sent, skipped);
            return digest("🔔 <b>Qarz muddati yaqinlashdi</b>", upcomingDebts,
                    d -> "%d kun qoldi".formatted(ChronoUnit.DAYS.between(today, d.getDueDate())));
        });

        telegramNotifier.send(digest);
        log.info("Debt reminder check completed");
    }

    /**
     * Muddati o'tgan qarzlar uchun har kuni ogohlantirish
     */
    @Scheduled(cron = "0 30 9 * * *")
    public void sendOverdueDebtWarnings() {
        lockService.runExclusively("overdue-debt-warnings", LOCK_TTL, this::runOverdueWarnings);
    }

    void runOverdueWarnings() {
        log.info("Starting overdue debt check...");
        LocalDate today = LocalDate.now();
        LocalDateTime since = today.atStartOfDay();

        String digest = transactionTemplate.execute(status -> {
            List<Debt> overdueDebts = debtRepository.findOverdueDebts(today);
            int sent = 0;
            int skipped = 0;

            for (Debt debt : overdueDebts) {
                if (alreadyNotifiedToday(debt, since)) {
                    skipped++;
                    continue;
                }
                try {
                    long daysOverdue = ChronoUnit.DAYS.between(debt.getDueDate(), today);
                    notificationService.createGlobalNotification(
                            "Muddati o'tgan qarz!",
                            String.format("%s ning qarzi %s so'm. Muddati %d kun oldin o'tgan!",
                                    debt.getCustomer().getFullName(), formatAmount(debt.getRemainingAmount()), daysOverdue),
                            StaffNotificationType.WARNING,
                            REF_TYPE,
                            debt.getId());
                    sent++;
                } catch (Exception e) {
                    log.error("Failed to send overdue warning for debt ID: {}", debt.getId(), e);
                }
            }

            log.info("Overdue debts: {} found, {} sent, {} already notified today",
                    overdueDebts.size(), sent, skipped);
            return digest("⚠️ <b>Muddati o'tgan qarzlar</b>", overdueDebts,
                    d -> "%d kun".formatted(ChronoUnit.DAYS.between(d.getDueDate(), today)));
        });

        telegramNotifier.send(digest);
        log.info("Overdue debt check completed");
    }

    private boolean alreadyNotifiedToday(Debt debt, LocalDateTime since) {
        return notificationRepository.existsByReferenceTypeAndReferenceIdAndCreatedAtGreaterThanEqual(
                REF_TYPE, debt.getId(), since);
    }

    private static String formatAmount(BigDecimal amount) {
        return String.format("%,.0f", amount);
    }

    /**
     * Qarzlar bo'yicha BITTA umumiy Telegram xabari.
     *
     * <p>Har bir qarz uchun alohida yuborilsa, 50 ta qarzi bor do'kon ertalab
     * 50 ta xabar olardi — bunday oqim o'qilmaydi va Telegram chegarasiga ham
     * urilardi. Tizim ichidagi bildirishnomalar esa har bir qarz uchun alohida
     * qoladi: xodim ro'yxatdan aniq qarzga o'tishi kerak.
     */
    private String digest(String heading, List<Debt> debts, Function<Debt, String> detail) {
        if (debts.isEmpty()) {
            return null;
        }

        BigDecimal total = debts.stream()
                .map(Debt::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        StringBuilder sb = new StringBuilder(heading)
                .append("%n%d ta mijoz, jami %,.0f so'm%n".formatted(debts.size(), total));

        // Faqat eng kattalari — qolgani ro'yxat sifatida ERPda ko'riladi
        debts.stream()
                .sorted(Comparator.comparing(Debt::getRemainingAmount).reversed())
                .limit(DIGEST_LIMIT)
                .forEach(d -> sb.append("%n• %s — %,.0f so'm (%s)".formatted(
                        escape(d.getCustomer().getFullName()),
                        d.getRemainingAmount(),
                        detail.apply(d))));

        if (debts.size() > DIGEST_LIMIT) {
            sb.append("%n… va yana %d ta".formatted(debts.size() - DIGEST_LIMIT));
        }
        return sb.toString();
    }

    private static String escape(String text) {
        return text == null ? "" : text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * Eski bildirishnomalarni tozalash (30 kundan eski)
     * Har kuni tunda soat 2:00 da ishga tushadi. Idempotent — qulf shart emas.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        log.info("Starting notification cleanup...");
        int deleted = notificationService.cleanupOldNotifications();
        log.info("Notification cleanup completed. Deleted {} old notifications", deleted);
    }
}
