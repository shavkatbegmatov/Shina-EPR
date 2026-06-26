package uz.shinamagazin.api.service.notify;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Default SMS sender — faqat log yozadi (HAQIQIY yuborish YO'Q). Provider tanlangach
 * (Eskiz.uz va h.k.) yangi {@link SmsSender} impl qo'shiladi (@Primary yoki @ConditionalOnProperty
 * `shop.notify.sms.provider`) — bu stub o'rnini egallaydi.
 */
@Component
@Slf4j
public class LogSmsSender implements SmsSender {

    @Override
    public void send(String phone, String message) {
        log.info("[SMS-STUB] -> {} : {}", phone, message);
    }
}
