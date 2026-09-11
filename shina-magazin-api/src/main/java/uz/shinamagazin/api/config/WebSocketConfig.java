package uz.shinamagazin.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.util.MimeTypeUtils;
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
    /** Boot'ning ObjectMapper'i — HTTP javoblari bilan bir xil JSON (jumladan offsetli vaqtlar). */
    private final ObjectMapper objectMapper;

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

    /**
     * STOMP xabarlari ham Boot ObjectMapper'i bilan yoziladi. Standart holatda Spring
     * WebSocket uchun ALOHIDA ObjectMapper yasaydi va u {@code @JsonComponent}
     * serializerlarni ko'rmaydi — bildirishnomalardagi vaqtlar HTTP javoblaridan farqli
     * (offsetsiz) chiqardi.
     */
    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);
        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setContentTypeResolver(resolver);
        messageConverters.add(converter);
        return false;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT token tekshirish uchun interceptor
        registration.interceptors(jwtChannelInterceptor);
    }
}
