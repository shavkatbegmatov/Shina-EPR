package uz.shinamagazin.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.service.StaffRegistrationService;

/**
 * Eski rad etilgan xodimlik arizalarini tozalaydi.
 *
 * <p>Ariza formasi OMMAVIY, ya'ni yozuvlar cheklanmagan darajada to'planishi
 * mumkin va ularning har birida shaxsiy ma'lumot bor (ism, telefon, IP).
 * Rad etilgan ariza esa bir muddatdan keyin hech qanday maqsadga xizmat
 * qilmaydi.
 *
 * <p>Ataylab ALOHIDA sinf: {@code DebtReminderScheduler} qarzlar haqida
 * bo'lib, unga allaqachon bildirishnoma tozalash ham qo'shib yuborilgan.
 * Uchinchi aloqasiz vazifani o'sha yerga tiqish faylni "har xil rejalar
 * qutisi"ga aylantirardi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaffRegistrationCleanupScheduler {

    private final StaffRegistrationService staffRegistrationService;

    /**
     * Har kuni tunda 3:30 da.
     *
     * <p>Vaqt boshqa rejalar bilan to'qnashmasin deb tanlangan: 2:00 da
     * bildirishnoma va sessiyalar, 3:00 da kirish urinishlari tozalanadi.
     */
    @Scheduled(cron = "0 30 3 * * *")
    public void cleanupRejectedRequests() {
        try {
            staffRegistrationService.cleanupRejected();
        } catch (Exception e) {
            // Tozalash YORDAMCHI vazifa: yiqilsa ham ilova ishlayveradi va
            // ertaga qayta uriniladi. Jimgina yutmaymiz — jurnalga yozamiz.
            log.error("Rad etilgan arizalarni tozalashda xatolik", e);
        }
    }
}
