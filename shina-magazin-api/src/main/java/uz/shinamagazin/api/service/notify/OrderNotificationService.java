package uz.shinamagazin.api.service.notify;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.config.NotificationProperties;
import uz.shinamagazin.api.entity.ShopOrder;

/**
 * Mijozga buyurtma tasdig'i xabarnomalari (SMS asosiy, email ixtiyoriy). Config-gated
 * (`shop.notify.*`, default O'CHIQ). Har kanal alohida try/catch bilan — xabarnoma
 * xatosi buyurtma yaratishni BUZMAYDI.
 *
 * Eslatma: mavjud {@code service.NotificationService} (mijoz in-app bildirishnomalari) va
 * {@code StaffNotificationService} (xodimga)dan ALOHIDA — bu storefront buyurtma SMS/email'i.
 *
 * Jonli sozlash A-guruhida: SMS uchun provider impl + kreditsial; email uchun
 * `spring.mail.*` (host/user/pass) — JavaMailSender sozlanmagan bo'lsa email skip qilinadi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderNotificationService {

    private final NotificationProperties props;
    private final SmsSender smsSender;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public void sendOrderConfirmation(ShopOrder order) {
        final String message = buildOrderMessage(order);

        // SMS — asosiy kanal (telefon doim mavjud)
        if (props.getSms().isEnabled()) {
            try {
                smsSender.send(order.getCustomerPhone(), message);
            } catch (Exception e) {
                log.warn("Buyurtma SMS xatosi ({}): {}", order.getOrderNo(), e.getMessage());
            }
        }

        // Email — ixtiyoriy (mijoz email bergan + JavaMailSender sozlangan bo'lsa)
        if (props.getEmail().isEnabled()
                && order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
            JavaMailSender mail = mailSenderProvider.getIfAvailable();
            if (mail == null) {
                log.debug("Email yoqilgan, lekin JavaMailSender yo'q (spring.mail.host sozlanmagan)");
                return;
            }
            try {
                SimpleMailMessage m = new SimpleMailMessage();
                m.setFrom(props.getEmail().getFrom());
                m.setTo(order.getCustomerEmail());
                m.setSubject(props.getEmail().getSubjectPrefix() + " " + order.getOrderNo());
                m.setText(message);
                mail.send(m);
            } catch (Exception e) {
                log.warn("Buyurtma email xatosi ({}): {}", order.getOrderNo(), e.getMessage());
            }
        }
    }

    private String buildOrderMessage(ShopOrder order) {
        return "Protektor: buyurtmangiz qabul qilindi. Raqam: " + order.getOrderNo()
                + ", summa: " + order.getTotalAmount() + " so'm. Rahmat!";
    }
}
