package uz.shinamagazin.api.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.StaffNotification;
import uz.shinamagazin.api.enums.StaffNotificationType;

import java.util.List;

@Repository
public interface StaffNotificationRepository extends JpaRepository<StaffNotification, Long> {

    /**
     * Foydalanuvchi uchun bildirishnomalar (user_id = ? OR user_id IS NULL)
     */
    @Query("SELECT n FROM StaffNotification n WHERE n.user.id = :userId OR n.user IS NULL ORDER BY n.createdAt DESC")
    Page<StaffNotification> findByUserIdOrGlobal(@Param("userId") Long userId, Pageable pageable);

    /**
     * Foydalanuvchi uchun bildirishnomalar (tur bo'yicha filtrlash)
     */
    @Query("SELECT n FROM StaffNotification n WHERE (n.user.id = :userId OR n.user IS NULL) AND n.notificationType = :type ORDER BY n.createdAt DESC")
    Page<StaffNotification> findByUserIdOrGlobalAndType(
            @Param("userId") Long userId,
            @Param("type") StaffNotificationType type,
            Pageable pageable);

    /**
     * Foydalanuvchi uchun o'qilmagan bildirishnomalar soni
     */
    @Query("SELECT COUNT(n) FROM StaffNotification n WHERE (n.user.id = :userId OR n.user IS NULL) AND n.isRead = false")
    long countUnreadByUserId(@Param("userId") Long userId);

    /**
     * Foydalanuvchi uchun o'qilmagan bildirishnomalar ro'yxati
     */
    @Query("SELECT n FROM StaffNotification n WHERE (n.user.id = :userId OR n.user IS NULL) AND n.isRead = false ORDER BY n.createdAt DESC")
    List<StaffNotification> findUnreadByUserId(@Param("userId") Long userId);

    /**
     * Foydalanuvchining barchasini o'qilgan qilish
     */
    @Modifying
    @Query("UPDATE StaffNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE (n.user.id = :userId OR n.user IS NULL) AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * Bitta bildirishnomani o'qilgan qilish — FAQAT chaqiruvchi ko'ra oladigan bo'lsa.
     *
     * Egalik sharti ({@code user.id = :userId OR user IS NULL}) yuqoridagi o'qish
     * so'rovlari bilan bir xil: shaxsiy bildirishnoma faqat egasiniki, global
     * (user IS NULL) esa barcha xodimlarniki. Aks holda id'ni ketma-ket sinab
     * chiqib boshqa xodimning bildirishnomasini o'zgartirish mumkin edi.
     *
     * @return 0 — topilmadi, chaqiruvchiniki emas yoki allaqachon o'qilgan
     *         (ataylab farqlanmaydi — mavjudlik oshkor bo'lmasin)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE StaffNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP
            WHERE n.id = :id AND n.isRead = false AND (n.user.id = :userId OR n.user IS NULL)""")
    int markAsReadByIdForUser(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * Bildirishnomani o'chirish — FAQAT chaqiruvchi ko'ra oladigan bo'lsa.
     *
     * @return o'chirilgan qatorlar soni (0 — topilmadi yoki chaqiruvchiniki emas)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM StaffNotification n WHERE n.id = :id AND (n.user.id = :userId OR n.user IS NULL)")
    int deleteByIdForUser(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * Eski bildirishnomalarni o'chirish (30 kundan eski)
     */
    @Modifying
    @Query("DELETE FROM StaffNotification n WHERE n.createdAt < CURRENT_TIMESTAMP - 30 DAY")
    int deleteOldNotifications();
}
