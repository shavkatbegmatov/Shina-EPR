package uz.shinamagazin.api.event;

import uz.shinamagazin.api.entity.StaffNotification;

/**
 * Saqlangan bildirishnomani WebSocket orqali tarqatish so'rovi.
 *
 * <p>Telegram kanali kabi bu ham TRANZAKSIYA TASDIQLANGANDAN KEYIN qayta
 * ishlanadi. Ilgari WS yuborish tranzaksiya ICHIDA chaqirilardi: savdo
 * yaratish o'rtasida tug'ilgan "kam zaxira" bildirishnomasi, savdo keyin
 * xatolik bilan qaytarilsa ham, barcha xodim brauzerlariga yetib borgan
 * bo'lardi — bosilganda 404 beradigan, yangilashda g'oyib bo'ladigan
 * "sharpa" yozuv.
 *
 * @param notification saqlangan bildirishnoma (rollback'da hodisa umuman ishlamaydi)
 * @param targetUserId null bo'lsa barcha xodimlarga, aks holda faqat shu foydalanuvchiga
 */
public record StaffNotificationBroadcastEvent(
        StaffNotification notification,
        Long targetUserId
) {}
