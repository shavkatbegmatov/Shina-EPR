package uz.shinamagazin.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAsync
public class ShinaMagazinApiApplication {

    /** Barcha sanalar Toshkent vaqtida saqlanadi va qaytariladi. */
    private static final String TIMEZONE = "Asia/Tashkent";

    public static void main(String[] args) {
        // Vaqt zonasi Spring ishga tushishidan OLDIN, birinchi qator: keyinroq
        // o'rnatilsa (masalan `@PostConstruct` da) Hibernate, ulanishlar hovuzi va
        // Flyway allaqachon boshqa zona bilan ishga tushgan bo'lishi mumkin.
        //
        // Bu ATAYLAB `main` ichida, alohida `@Configuration` da EMAS: `TimeZone.setDefault`
        // butun JVM'ga ta'sir qiladi va uni ilova ishlash paytida o'zgartirish — Spring
        // konteksti ko'tarilayotganda — yon ta'sir beradi. 10.09.2026 da aynan shu tufayli
        // backend testlari sinflar tartibiga bog'liq bo'lib qolgan edi: `@SpringBootTest`
        // kontekst ko'targanda JVM zonasi UTC'dan Toshkentga o'zgarardi va keyin ishlagan
        // testlarda kunlik hisobot sanalari siljirdi (`ProfitLossReportTest`). `main`
        // testlarda umuman chaqirilmaydi, ya'ni endi bunday siljish yo'q.
        //
        // Konteynerda zona `ENV TZ=Asia/Tashkent` bilan ham beriladi (Dockerfile) — bu
        // yer ikkinchi himoya: JAR to'g'ridan-to'g'ri ishga tushirilsa ham zona to'g'ri.
        TimeZone.setDefault(TimeZone.getTimeZone(TIMEZONE));
        SpringApplication.run(ShinaMagazinApiApplication.class, args);
    }
}
