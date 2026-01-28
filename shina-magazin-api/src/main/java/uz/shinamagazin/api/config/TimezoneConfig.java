package uz.shinamagazin.api.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

/**
 * Timezone konfiguratsiyasi - Toshkent vaqti (UTC+5)
 * Bu loyihada barcha sanalar Toshkent vaqtida saqlanadi va qaytariladi.
 */
@Configuration
public class TimezoneConfig {

    private static final String TASHKENT_TIMEZONE = "Asia/Tashkent";

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(TASHKENT_TIMEZONE));
    }
}
