package uz.shinamagazin.api.service.notify;

/**
 * SMS yuborish abstraksiyasi. Hozirgi impl: {@link LogSmsSender} (log-stub, haqiqiy
 * yuborish yo'q). Jonli provider (Eskiz.uz / Play Mobile) shu interfeysni qondiradi —
 * {@link NotificationService} kodi o'zgarmaydi.
 */
public interface SmsSender {

    /** SMS yuboradi (yoki stub'da log yozadi). Xatolikda istisno tashlashi mumkin. */
    void send(String phone, String message);
}
