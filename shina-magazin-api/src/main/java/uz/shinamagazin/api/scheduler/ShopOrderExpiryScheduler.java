package uz.shinamagazin.api.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.service.SchedulerLockService;
import uz.shinamagazin.api.service.ShopOrderService;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Tashlab ketilgan onlayn buyurtmalarni bekor qilib, zaxirani bo'shatadi.
 *
 * <p>Vitrina buyurtma yaratilganda zaxirani darhol rezerv qiladi. Mijoz to'lov
 * sahifasiga o'tib, to'lamasdan ketsa, hech narsa rezervni qaytarmasdi — bir necha
 * "tashlab ketilgan savat" ommabop shinani do'kon uchun ham ko'rinmas qilib qo'yardi
 * (inventar DoS). Naqd buyurtmalarga tegilmaydi — ularni operator boshqaradi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShopOrderExpiryScheduler {

    /** To'lov boshlangandan keyin shuncha daqiqa ichida yakunlanmasa — bekor. */
    static final int EXPIRY_MINUTES = 60;

    private final ShopOrderService shopOrderService;
    private final SchedulerLockService lockService;

    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT2M")
    public void expireAbandonedOnlineOrders() {
        lockService.runExclusively("shop-order-expiry", Duration.ofMinutes(9), () -> {
            LocalDateTime cutoff = LocalDateTime.now().minusMinutes(EXPIRY_MINUTES);
            int expired = shopOrderService.expireUnpaidOnlineOrders(cutoff);
            if (expired > 0) {
                log.info("{} ta tashlab ketilgan onlayn buyurtma bekor qilindi, zaxira qaytarildi", expired);
            }
        });
    }
}
