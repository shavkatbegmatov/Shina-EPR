package uz.shinamagazin.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import uz.shinamagazin.api.audit.AuditCorrelationInterceptor;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AuditCorrelationInterceptor auditCorrelationInterceptor;
    private final StorageProperties storageProperties;

    // application.yml `cors.allowed-origins` (prod'da CORS_ALLOWED_ORIGINS env)
    @Value("${cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auditCorrelationInterceptor)
                .addPathPatterns("/v1/**")  // Apply to all API endpoints
                .excludePathPatterns("/v1/auth/**");  // Exclude auth endpoints
    }

    /**
     * Yuklangan rasmlarni statik xizmat qilish: `/api/uploads/**` (context-path `/api`
     * + handler `/uploads/**`) -> {@code shop.storage.dir} papkasi. GET ommaviy
     * (SecurityConfig permitAll). Faqat lokal-storage uchun.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get(storageProperties.getDir()).toAbsolutePath().normalize();
        String location = uploadDir.toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
