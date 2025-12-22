package uz.shinamagazin.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ShinaMagazinApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShinaMagazinApiApplication.class, args);
    }
}
