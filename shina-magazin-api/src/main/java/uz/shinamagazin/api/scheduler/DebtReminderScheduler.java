package uz.shinamagazin.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.service.StaffNotificationService;
import uz.shinamagazin.api.service.TelegramNotifier;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

/**
 * Qarz muddati yaqinlashganda avtomatik eslatma yuboradi
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DebtReminderScheduler {

    /** Telegram xulosasida ko'rsatiladigan mijozlar soni. */
    private static final int DIGEST_LIMIT = 10;

    private final DebtRepository debtRepository;
    private final StaffNotificationService notificationService;
    private final TelegramNotifier telegramNotifier;

    /**
     * Har kuni ertalab soat 9:00 da ishga tushadi
     * Muddati 3 kun ichida tugaydigan qarzlar uchun eslatma yuboradi
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDebtReminders() {
        log.info("Starting debt reminder check...");

        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusDays(3);

        List<Debt> upcomingDebts = debtRepository.findDebtsWithUpcomingDueDate(today, endDate);

        log.info("Found {} debts with upcoming due dates", upcomingDebts.size());

        for (Debt debt : upcomingDebts) {
            try {
                long daysLeft = ChronoUnit.DAYS.between(today, debt.getDueDate());
                String formattedAmount = String.format("%,.0f", debt.getRemainingAmount());

                notificationService.notifyDebtReminder(
                        debt.getCustomer().getFullName(),
                        formattedAmount,
                        (int) daysLeft,
                        debt.getId()
                );

                log.info("Sent reminder for debt ID: {}, customer: {}, days left: {}",
                        debt.getId(), debt.getCustomer().getFullName(), daysLeft);
            } catch (Exception e) {
                log.error("Failed to send reminder for debt ID: {}", debt.getId(), e);
            }
        }

        telegramNotifier.send(digest("🔔 <b>Qarz muddati yaqinlashdi</b>", upcomingDebts,
                d -> "%d kun qoldi".formatted(ChronoUnit.DAYS.between(today, d.getDueDate()))));

        log.info("Debt reminder check completed");
    }

    /**
     * Muddati o'tgan qarzlar uchun har kuni ogohlantirish
     */
    @Scheduled(cron = "0 30 9 * * *")
    public void sendOverdueDebtWarnings() {
        log.info("Starting overdue debt check...");

        LocalDate today = LocalDate.now();
        List<Debt> overdueDebts = debtRepository.findOverdueDebts(today);

        log.info("Found {} overdue debts", overdueDebts.size());

        for (Debt debt : overdueDebts) {
            try {
                long daysOverdue = ChronoUnit.DAYS.between(debt.getDueDate(), today);
                String formattedAmount = String.format("%,.0f", debt.getRemainingAmount());

                notificationService.createGlobalNotification(
                        "Muddati o'tgan qarz!",
                        String.format("%s ning qarzi %s so'm. Muddati %d kun oldin o'tgan!",
                                debt.getCustomer().getFullName(), formattedAmount, daysOverdue),
                        uz.shinamagazin.api.enums.StaffNotificationType.WARNING,
                        "DEBT",
                        debt.getId()
                );

                log.info("Sent overdue warning for debt ID: {}, customer: {}, days overdue: {}",
                        debt.getId(), debt.getCustomer().getFullName(), daysOverdue);
            } catch (Exception e) {
                log.error("Failed to send overdue warning for debt ID: {}", debt.getId(), e);
            }
        }

        telegramNotifier.send(digest("⚠️ <b>Muddati o'tgan qarzlar</b>", overdueDebts,
                d -> "%d kun".formatted(ChronoUnit.DAYS.between(d.getDueDate(), today))));

        log.info("Overdue debt check completed");
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
     * Har kuni tunda soat 2:00 da ishga tushadi
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        log.info("Starting notification cleanup...");
        int deleted = notificationService.cleanupOldNotifications();
        log.info("Notification cleanup completed. Deleted {} old notifications", deleted);
    }
}
