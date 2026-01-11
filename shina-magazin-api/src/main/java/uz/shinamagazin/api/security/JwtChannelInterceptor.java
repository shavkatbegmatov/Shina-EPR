package uz.shinamagazin.api.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                if (jwtTokenProvider.validateToken(token)) {
                    String username = jwtTokenProvider.getUsernameFromToken(token);
                    String tokenType = jwtTokenProvider.getTokenType(token);
                    boolean isCustomer = "CUSTOMER".equals(tokenType);

                    // Principal yaratish
                    String principalName = isCustomer ? "customer_" + username : username;
                    String role = isCustomer ? "ROLE_CUSTOMER" : "ROLE_STAFF";

                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            principalName,
                            null,
                            List.of(new SimpleGrantedAuthority(role))
                    );

                    accessor.setUser(auth);
                    log.debug("WebSocket authenticated: {} ({})", principalName, tokenType);
                } else {
                    log.warn("Invalid JWT token in WebSocket connection");
                }
            } else {
                log.debug("No Authorization header in WebSocket connection");
            }
        }

        return message;
    }
}
