package uz.shinamagazin.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import uz.shinamagazin.api.service.SessionService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * WebSocket ulanishida sessiya tekshiruvi.
 *
 * <p>REST filtri sessiyasi bekor qilingan tokenni o'tkazmaydi, lekin
 * WebSocket interceptor faqat token imzosini tekshirardi: deaktivatsiya
 * qilingan yoki paroli almashtirilgan xodim token muddati tugagunga qadar
 * bildirishnoma olishda davom etar, sessiya yozuvi bo'lmagan refresh
 * tokenlar ham ulana olardi.
 */
class JwtChannelInterceptorTest {

    private JwtTokenProvider tokenProvider;
    private SessionService sessionService;
    private JwtChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        tokenProvider = mock(JwtTokenProvider.class);
        sessionService = mock(SessionService.class);
        interceptor = new JwtChannelInterceptor(tokenProvider, sessionService);

        when(tokenProvider.validateToken(anyString())).thenReturn(true);
        when(tokenProvider.getUsernameFromToken(anyString())).thenReturn("kassir");
        when(tokenProvider.getUserIdFromToken(anyString())).thenReturn(5L);
    }

    private StompHeaderAccessor connect(String token) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer " + token);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, mock(MessageChannel.class));
        return accessor;
    }

    @Test
    @DisplayName("Sessiyasi bekor qilingan xodim tokeni WebSocket'ga ulanmaydi")
    void staffTokenWithoutSessionIsRejected() {
        when(tokenProvider.getTokenType(anyString())).thenReturn("STAFF");
        when(sessionService.isSessionValid(anyString())).thenReturn(false);

        StompHeaderAccessor accessor = connect("revoked-token");

        assertThat(accessor.getUser())
                .as("sessiya yo'q — principal o'rnatilmaydi")
                .isNull();
    }

    @Test
    @DisplayName("Tirik sessiyali xodim tokeni ulanadi")
    void staffTokenWithSessionConnects() {
        when(tokenProvider.getTokenType(anyString())).thenReturn("STAFF");
        when(sessionService.isSessionValid(anyString())).thenReturn(true);

        StompHeaderAccessor accessor = connect("live-token");

        assertThat(accessor.getUser()).isNotNull();
        assertThat(accessor.getUser().getName()).isEqualTo("5");
    }

    @Test
    @DisplayName("Mijoz tokeni sessiya tekshiruvidan o'tmaydi (unda sessiya yozuvi yo'q)")
    void customerTokenSkipsSessionCheck() {
        when(tokenProvider.getTokenType(anyString())).thenReturn("CUSTOMER");

        StompHeaderAccessor accessor = connect("customer-token");

        assertThat(accessor.getUser()).isNotNull();
        assertThat(accessor.getUser().getName()).isEqualTo("customer_5");
        verify(sessionService, never()).isSessionValid(anyString());
    }
}
