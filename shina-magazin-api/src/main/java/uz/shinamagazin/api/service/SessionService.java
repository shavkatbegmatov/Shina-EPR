package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import uz.shinamagazin.api.dto.websocket.SessionUpdateMessage;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.SessionRepository;
import uz.shinamagazin.api.util.UserAgentParser;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UserAgentParser userAgentParser;
    private final NotificationDispatcher notificationDispatcher;

    /** Sessiya oilasining umri — tozalash aynan shu bo'yicha ketadi. */
    @org.springframework.beans.factory.annotation.Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    /** lastActivityAt DB'ga qancha tez-tez yoziladi (qarang {@link #touchActivity}). */
    private static final long ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60_000;
    private static final int ACTIVITY_CACHE_MAX_KEYS = 50_000;
    /** tokenHash -> oxirgi DB yozuvi (epoch ms). Faqat shu instansiya uchun. */
    private final ConcurrentHashMap<String, Long> lastActivityTouch = new ConcurrentHashMap<>();

    /**
     * {@link #touchActivity} uchun: keshni tekshirgandan KEYINGINA tranzaksiya ochish
     * (aks holda har so'rov uchun bekorga connection olinardi). Ixtiyoriy — testlarda
     * servis qo'lda yaratilganda null bo'ladi.
     */
    @Autowired(required = false)
    private TransactionTemplate transactionTemplate;

    // Constructor with @Lazy to break circular dependency
    public SessionService(
            SessionRepository sessionRepository,
            UserAgentParser userAgentParser,
            @Lazy NotificationDispatcher notificationDispatcher
    ) {
        this.sessionRepository = sessionRepository;
        this.userAgentParser = userAgentParser;
        this.notificationDispatcher = notificationDispatcher;
    }

    /**
     * Create a new session when user logs in.
     *
     * <p>Refresh token hashi ham saqlanadi: refresh faqat TIRIK sessiya
     * bilan ishlaydi, ya'ni barcha revocation yo'llari (logout, parol
     * almashtirish, deaktivatsiya, admin revoke) refresh tokenni ham
     * avtomatik o'ldiradi.
     */
    @Transactional
    public Session createSession(User user, String token, String refreshToken,
                                 String ipAddress, String userAgent, LocalDateTime expiresAt) {
        String tokenHash = hashToken(token);
        UserAgentParser.DeviceInfo deviceInfo = userAgentParser.parse(userAgent);

        Session session = Session.builder()
                .user(user)
                .tokenHash(tokenHash)
                .refreshTokenHash(refreshToken != null ? hashToken(refreshToken) : null)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .deviceType(deviceInfo.getDeviceType())
                .browser(deviceInfo.getBrowser())
                .os(deviceInfo.getOs())
                .expiresAt(expiresAt)
                .lastActivityAt(LocalDateTime.now())
                .isActive(true)
                .build();

        Session savedSession = sessionRepository.save(session);

        // Notify user's other devices about new session via WebSocket
        SessionUpdateMessage message = SessionUpdateMessage.sessionCreated(
            savedSession.getId(),
            user.getId(),
            "New login from " + deviceInfo.getDeviceType() + " - " + deviceInfo.getBrowser()
        );
        notificationDispatcher.notifySessionUpdate(user.getId(), message);

        log.info("Session {} created for user {} from {}", savedSession.getId(), user.getId(), ipAddress);

        return savedSession;
    }

    /**
     * Get all active sessions for a user
     */
    @Transactional(readOnly = true)
    public List<Session> getActiveSessions(Long userId) {
        return sessionRepository.findActiveSessionsByUserId(userId);
    }

    /**
     * Revoke a specific session
     */
    @Transactional
    public void revokeSession(Long sessionId, Long userId, String reason) {
        revokeSession(sessionId, userId, reason, true);
    }

    /**
     * Revoke a specific session with optional notification
     */
    @Transactional
    public void revokeSession(Long sessionId, Long userId, String reason, boolean sendNotification) {
        int updated = sessionRepository.revokeSession(
                sessionId,
                userId,
                LocalDateTime.now(),
                userId,
                reason
        );

        if (updated == 0) {
            throw new ResourceNotFoundException("Session", "id", sessionId);
        }

        log.info("Session {} revoked by user {}: {}", sessionId, userId, reason);

        // Notify user via WebSocket for real-time update (only if not self-logout)
        if (sendNotification) {
            SessionUpdateMessage message = SessionUpdateMessage.sessionRevoked(sessionId, userId, reason);
            notificationDispatcher.notifySessionUpdate(userId, message);
        }
    }

    /**
     * Revoke all sessions except current
     */
    @Transactional
    public int revokeAllSessionsExcept(Long userId, Long currentSessionId) {
        int count = sessionRepository.revokeAllSessionsExcept(
                userId,
                currentSessionId,
                LocalDateTime.now(),
                userId,
                "Logged out from all other devices"
        );

        log.info("Revoked {} sessions for user {}", count, userId);

        // Notify user via WebSocket for real-time update (multiple sessions revoked)
        if (count > 0) {
            SessionUpdateMessage message = SessionUpdateMessage.sessionRevoked(
                    null, // Multiple sessions, no single ID
                    userId,
                    "Logged out from all other devices (" + count + " sessions)"
            );
            notificationDispatcher.notifySessionUpdate(userId, message);
        }

        return count;
    }

    /**
     * Check if session is valid (exists and active)
     */
    @Transactional(readOnly = true)
    public boolean isSessionValid(String token) {
        String tokenHash = hashToken(token);
        return sessionRepository.findByTokenHash(tokenHash)
                .map(session -> session.getIsActive() && session.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    /**
     * Refresh token bo'yicha TIRIK sessiyani topadi — qatorni qulflab.
     *
     * <p>readOnly EMAS: {@code FOR UPDATE} qulfi rotatsiya yozilguncha ushlab turiladi
     * (chaqiruvchi tranzaksiyasiga qo'shiladi), shunda parallel refresh poygasi
     * reuse-detection'ni chetlab o'ta olmaydi.
     */
    @Transactional
    public Optional<Session> findActiveSessionByRefreshToken(String refreshToken) {
        return sessionRepository.findByRefreshTokenHashForUpdate(hashToken(refreshToken))
                .filter(Session::getIsActive);
    }

    /**
     * Rotatsiyadan chiqqan eski refresh token qayta kelsa — bu o'g'irlangan
     * token belgisi (yoki juda kam holda parallel refresh poygasi). Ikkala
     * holatda ham xavfsiz javob bitta: butun sessiyani bekor qilish, shunda
     * o'g'irlangan JUFTLIKNING yangisi ham ishlamay qoladi.
     *
     * @return true — qayta ishlatish aniqlanib, sessiya bekor qilindi
     */
    @Transactional
    public boolean revokeIfRefreshTokenReused(String refreshToken) {
        return sessionRepository.findByPreviousRefreshTokenHash(hashToken(refreshToken))
                .filter(Session::getIsActive)
                .map(session -> {
                    session.setIsActive(false);
                    session.setRevokedAt(LocalDateTime.now());
                    session.setRevokedBy(session.getUser().getId());
                    session.setRevokeReason("Refresh token qayta ishlatildi — xavfsizlik uchun sessiya yopildi");
                    sessionRepository.save(session);
                    log.warn("Session {} revoked: rotated refresh token was reused", session.getId());
                    return true;
                })
                .orElse(false);
    }

    /**
     * Refresh: ikkala token ham AYNI SHU sessiya qatorida almashtiriladi.
     * Eski refresh hash previous_* ga ko'chadi (reuse-detection uchun),
     * eski access token hashi almashgani zahoti filtrda o'tmay qoladi.
     */
    @Transactional
    public Session rotateSessionTokens(Session session, String newAccessToken,
                                       String newRefreshToken, LocalDateTime newExpiresAt) {
        session.setPreviousRefreshTokenHash(session.getRefreshTokenHash());
        session.setTokenHash(hashToken(newAccessToken));
        session.setRefreshTokenHash(hashToken(newRefreshToken));
        session.setExpiresAt(newExpiresAt);
        session.setLastActivityAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    /**
     * Mutlaq muddat tugagan sessiyani yopadi (qurilma qayta login qilishi shart).
     */
    @Transactional
    public void expireSessionFamily(Session session) {
        session.setIsActive(false);
        session.setRevokedAt(LocalDateTime.now());
        session.setRevokedBy(session.getUser().getId());
        session.setRevokeReason("Sessiyaning mutlaq muddati tugadi");
        sessionRepository.save(session);
    }

    /**
     * Sessiya faolligini belgilaydi — lekin har so'rovda emas.
     *
     * <p>Ilgari HAR autentifikatsiyalangan so'rov sessions jadvaliga UPDATE yozardi
     * (o'qish + tekshiruv + yozuv — uch DB muloqoti). Issiq jadvalda bu qator qulflari
     * va WAL yuki. "Oxirgi faollik" ko'rsatkichi uchun 5 daqiqalik aniqlik yetarli:
     * shu oraliqda takroriy chaqiruvlar DB'ga bormaydi.
     */
    public void touchActivity(String token) {
        String tokenHash = hashToken(token);
        long now = System.currentTimeMillis();
        Long previous = lastActivityTouch.get(tokenHash);
        if (previous != null && now - previous < ACTIVITY_TOUCH_INTERVAL_MS) {
            return;
        }
        if (lastActivityTouch.size() >= ACTIVITY_CACHE_MAX_KEYS) {
            lastActivityTouch.clear(); // eng yomon holatda bitta ortiqcha UPDATE
        }
        lastActivityTouch.put(tokenHash, now);

        LocalDateTime timestamp = LocalDateTime.now();
        if (transactionTemplate != null) {
            transactionTemplate.executeWithoutResult(
                    status -> sessionRepository.updateLastActivity(tokenHash, timestamp));
        } else {
            sessionRepository.updateLastActivity(tokenHash, timestamp);
        }
    }

    /**
     * Get session by token
     */
    @Transactional(readOnly = true)
    public Optional<Session> getSessionByToken(String token) {
        String tokenHash = hashToken(token);
        return sessionRepository.findByTokenHash(tokenHash);
    }

    /**
     * Cleanup expired sessions (scheduled task)
     */
    @Transactional
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    public void cleanupExpiredSessions() {
        // Sessiya oilasining muddati — refresh-expiration (access oynasi emas),
        // qarang SessionRepository.deleteExpiredSessions izohi
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(refreshExpiration / 1000);
        int deleted = sessionRepository.deleteExpiredSessions(cutoff);
        log.info("Cleaned up {} expired sessions", deleted);
    }

    /**
     * Hash JWT token for storage
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
