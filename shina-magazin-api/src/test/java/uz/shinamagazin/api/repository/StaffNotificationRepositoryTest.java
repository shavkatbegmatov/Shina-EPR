package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;
import uz.shinamagazin.api.entity.StaffNotification;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.enums.StaffNotificationType;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Bildirishnomalarda EGALIK (ownership) tekshiruvini qulflaydi.
 *
 * Tarixiy zaiflik: `markAsRead`/`deleteNotification` faqat mavjudlikni
 * tekshirardi (`existsById` + `deleteById`), userId bo'yicha filtrlamasdi.
 * Ya'ni istalgan autentifikatsiyalangan foydalanuvchi id'ni ketma-ket sinab
 * chiqib boshqa xodimning bildirishnomalarini o'chirib tashlay olardi.
 *
 * Bu tekshiruv @Query ichida bo'lgani uchun mock bilan isbotlab bo'lmaydi —
 * haqiqiy DB (H2) kerak.
 */
@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:staff-notifications;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@TestPropertySource(properties = "spring.jpa.properties.jakarta.persistence.validation.mode=none")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StaffNotificationRepositoryTest {

    @Autowired private StaffNotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    private Long aliceId;
    private Long bobId;
    private Long alicesNotificationId;
    private Long globalNotificationId;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        User alice = userRepository.saveAndFlush(user("alice"));
        User bob = userRepository.saveAndFlush(user("bob"));
        aliceId = alice.getId();
        bobId = bob.getId();

        alicesNotificationId = notificationRepository
                .saveAndFlush(notification(alice, "Alice uchun shaxsiy")).getId();
        globalNotificationId = notificationRepository
                .saveAndFlush(notification(null, "Barcha xodimlar uchun")).getId();
    }

    @Test
    @DisplayName("Bob Alice'ning shaxsiy bildirishnomasini O'CHIRA OLMAYDI")
    void otherUserCannotDeletePersonalNotification() {
        int deleted = notificationRepository.deleteByIdForUser(alicesNotificationId, bobId);

        assertThat(deleted).isZero();
        assertThat(notificationRepository.findById(alicesNotificationId)).isPresent();
    }

    @Test
    @DisplayName("Bob Alice'ning bildirishnomasini o'qilgan deb BELGILAY OLMAYDI")
    void otherUserCannotMarkPersonalNotificationAsRead() {
        int updated = notificationRepository.markAsReadByIdForUser(alicesNotificationId, bobId);

        assertThat(updated).isZero();
        assertThat(notificationRepository.findById(alicesNotificationId))
                .get()
                .extracting(StaffNotification::getIsRead)
                .isEqualTo(false);
    }

    @Test
    @DisplayName("Egasi o'z bildirishnomasini o'chira oladi")
    void ownerCanDeleteOwnNotification() {
        assertThat(notificationRepository.deleteByIdForUser(alicesNotificationId, aliceId)).isEqualTo(1);
        assertThat(notificationRepository.findById(alicesNotificationId)).isEmpty();
    }

    @Test
    @DisplayName("Egasi o'z bildirishnomasini o'qilgan qila oladi")
    void ownerCanMarkOwnNotificationAsRead() {
        assertThat(notificationRepository.markAsReadByIdForUser(alicesNotificationId, aliceId)).isEqualTo(1);
    }

    @Test
    @DisplayName("Global bildirishnoma barcha xodimlarga ochiq qoladi (mavjud xatti-harakat)")
    void globalNotificationRemainsAccessibleToEveryone() {
        assertThat(notificationRepository.markAsReadByIdForUser(globalNotificationId, bobId)).isEqualTo(1);
    }

    @Test
    @DisplayName("Allaqachon o'qilgan bildirishnoma 0 qaytaradi (mavjudlik oshkor bo'lmasin)")
    void alreadyReadNotificationReturnsZero() {
        notificationRepository.markAsReadByIdForUser(alicesNotificationId, aliceId);

        assertThat(notificationRepository.markAsReadByIdForUser(alicesNotificationId, aliceId)).isZero();
    }

    // --- helpers ---

    private static User user(String username) {
        User u = new User();
        u.setUsername(username);
        u.setPassword("{noop}x");
        u.setFullName(username);
        u.setRole(Role.SELLER);
        u.setActive(true);
        return u;
    }

    private static StaffNotification notification(User owner, String title) {
        return StaffNotification.builder()
                .user(owner)
                .title(title)
                .message("test")
                .notificationType(StaffNotificationType.ORDER)
                .isRead(false)
                .build();
    }
}
