package uz.shinamagazin.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Mijozga buyurtma xabarnomalari sozlamalari (application.yml: `shop.notify.*`).
 *
 * Default: O'CHIQ (no-op). SMS asosiy kanal (storefront telefon doim bor); email ixtiyoriy.
 * Jonli: SMS provider impl + kreditsial; email uchun `spring.mail.*` + email.enabled (A-guruhi).
 */
@Component
@ConfigurationProperties(prefix = "shop.notify")
@Data
public class NotificationProperties {

    private Sms sms = new Sms();
    private Email email = new Email();

    @Data
    public static class Sms {
        private boolean enabled = false;
        /** Provider tanlovi (kelajakda: eskiz / playmobile). Default "log" — faqat log yozadi. */
        private String provider = "log";
    }

    @Data
    public static class Email {
        private boolean enabled = false;
        private String from = "Protektor <no-reply@protektor.uz>";
        private String subjectPrefix = "Protektor — buyurtma";
    }
}
