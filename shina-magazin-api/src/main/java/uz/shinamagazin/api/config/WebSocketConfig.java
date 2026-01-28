package uz.shinamagazin.api.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import uz.shinamagazin.api.security.JwtChannelInterceptor;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

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
                .setAllowedOrigins(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "http://127.0.0.1:5173"
                )
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // JWT token tekshirish uchun interceptor
        registration.interceptors(jwtChannelInterceptor);
    }
}
