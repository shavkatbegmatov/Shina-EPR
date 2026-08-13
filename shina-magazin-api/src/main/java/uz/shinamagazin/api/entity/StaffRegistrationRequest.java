package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;

import java.time.LocalDateTime;

/**
 * Xodimlikka ro'yxatdan o'tish so'rovi (`/admin/register` dan).
 *
 * <p>So'rov OMMAVIY yuboriladi — autentifikatsiyasiz. Shuning uchun bu yozuv
 * hech qanday huquq bermaydi: u faqat "shunday odam murojaat qildi" degani.
 * Haqiqiy akkaunt faqat xodim tasdiqlagach yaratiladi.
 */
@Entity
@Table(name = "staff_registration_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffRegistrationRequest extends BaseEntity {

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "company_name", length = 200)
    private String companyName;

    /**
     * So'rovchi TAKLIF qilgan rol — qaror emas, iltimos.
     *
     * <p>Yakuniy rolni tasdiqlayotgan xodim tanlaydi: aks holda istalgan odam
     * o'ziga ADMIN so'rab, tasdiqlovchi e'tibor bermay bosib yuborsa,
     * to'liq huquqli akkaunt ochilib qolardi.
     */
    @Column(name = "requested_role", nullable = false, length = 30)
    private String requestedRole;

    @Column(length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StaffRegistrationStatus status = StaffRegistrationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    /** Tasdiqlangach yaratilgan xodim. Rad etilganda null. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    /** Ommaviy endpoint — suiiste'mol tekshiruvi uchun. */
    @Column(name = "client_ip", length = 45)
    private String clientIp;

    // ─── Telegram orqali javob berish ───

    /**
     * Arizachining chati. Bot unga qaror haqida shu yerga yozadi.
     *
     * <p>Null bo'lishi normal: arizachi havolani ochmagan bo'lishi mumkin,
     * u holda xabar yuborilmaydi va xodim qo'lda bog'lanadi.
     */
    @Column(name = "telegram_chat_id")
    private Long telegramChatId;

    /**
     * Bir martalik token — `t.me/<bot>?start=staff_<token>` havolasi uchun.
     *
     * <p>Ariza ID'si emas, ataylab tasodifiy: ketma-ket ID bo'lganda
     * istalgan odam raqamlarni sinab, begona arizaga o'z chatini bog'lab,
     * boshqa odamning qarori va login'ini o'qib olardi.
     */
    @Column(name = "telegram_link_token", length = 40)
    private String telegramLinkToken;
}
