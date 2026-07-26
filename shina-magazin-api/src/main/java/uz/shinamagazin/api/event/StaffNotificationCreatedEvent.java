package uz.shinamagazin.api.event;

import uz.shinamagazin.api.enums.StaffNotificationType;

/**
 * Xodimlar bildirishnomasi yaratildi.
 *
 * <p>Tashqi kanallar (Telegram) shu hodisaga obuna bo'ladi. To'g'ridan-to'g'ri
 * chaqirish o'rniga hodisa ishlatilishining sababi — u TRANZAKSIYA
 * TASDIQLANGANDAN KEYIN qayta ishlanadi: savdo keyinchalik bekor bo'lsa,
 * "kam zaxira" haqidagi soxta xabar allaqachon yuborilgan bo'lib qolmaydi.
 */
public record StaffNotificationCreatedEvent(
        String title,
        String message,
        StaffNotificationType type,
        String referenceType
) {}
