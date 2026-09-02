package uz.shinamagazin.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import uz.shinamagazin.api.security.JwtChannelInterceptor;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    /**
     * HTTP CORS bilan bir xil ro'yxat ({@code cors.allowed-origins}, prod'da
     * {@code CORS_ALLOWED_ORIGINS}). Ilgari bu yerda faqat dev hostlar qattiq yozilgan edi:
     * brauzer WebSocket handshake'ga doim {@code Origin} yuboradi, prod domeni ro'yxatda
     * bo'lmagani uchun handshake 403 olardi va SockJS xhr-streaming'ga tushib qolardi.
     */
    @Value("${cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Server -> Client uchun prefix'lar
        registry.enableSimpleBroker("/topic", "/queue");
        // Client -> Server uchun prefix
        registry.setApplicationDestinationPrefixes("/app");
        // User-specific xabarlar uchun prefix
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint
        registry.addEndpoint("/v1/ws")
                .setAllowedOrigins(allowedOrigins.toArray(new String[0]))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT token tekshirish uchun interceptor
        registration.interceptors(jwtChannelInterceptor);
    }
}
