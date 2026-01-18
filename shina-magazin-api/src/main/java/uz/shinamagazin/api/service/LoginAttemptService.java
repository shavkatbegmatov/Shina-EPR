package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.entity.LoginAttempt;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.repository.LoginAttemptRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.util.UserAgentParser;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginAttemptService {

    private final LoginAttemptRepository loginAttemptRepository;
    private final UserRepository userRepository;
    private final UserAgentParser userAgentParser;

    // Lockout configuration
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 30;

    /**
     * Log a successful login attempt
     */
    @Transactional
    public void logSuccessfulAttempt(String username, String ipAddress, String userAgent, Session session) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            UserAgentParser.DeviceInfo deviceInfo = userAgentParser.parse(userAgent);

            LoginAttempt attempt = LoginAttempt.builder()
                    .user(user)
                    .username(username)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .deviceType(deviceInfo.getDeviceType())
                    .browser(deviceInfo.getBrowser())
                    .os(deviceInfo.getOs())
                    .status(LoginAttempt.LoginStatus.SUCCESS)
                    .session(session)
                    .build();

            loginAttemptRepository.save(attempt);
            log.info("Logged successful login for user: {} from IP: {}", username, ipAddress);
        } catch (Exception e) {
            log.error("Error logging successful login attempt", e);
        }
    }

    /**
     * Log a failed login attempt
     */
    @Transactional
    public void logFailedAttempt(
            String username,
            String ipAddress,
            String userAgent,
            LoginAttempt.FailureReason reason,
            String message
    ) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            UserAgentParser.DeviceInfo deviceInfo = userAgentParser.parse(userAgent);

            LoginAttempt attempt = LoginAttempt.builder()
                    .user(user)
                    .username(username)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .deviceType(deviceInfo.getDeviceType())
                    .browser(deviceInfo.getBrowser())
                    .os(deviceInfo.getOs())
                    .status(LoginAttempt.LoginStatus.FAILED)
                    .failureReason(reason)
                    .failureMessage(message)
                    .build();

            loginAttemptRepository.save(attempt);
            log.warn("Logged failed login for user: {} from IP: {} - Reason: {}",
                    username, ipAddress, reason);
        } catch (Exception e) {
            log.error("Error logging failed login attempt", e);
        }
    }

    /**
     * Check if account should be locked due to too many failed attempts
     */
    @Transactional(readOnly = true)
    public boolean isAccountLocked(String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(LOCKOUT_DURATION_MINUTES);
        long failedAttempts = loginAttemptRepository.countRecentFailedAttempts(username, since);
        return failedAttempts >= MAX_FAILED_ATTEMPTS;
    }

    /**
     * Get remaining lockout time in minutes
     */
    @Transactional(readOnly = true)
    public long getRemainingLockoutTime(String username) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(LOCKOUT_DURATION_MINUTES);
        List<LoginAttempt> attempts = loginAttemptRepository.findRecentFailedAttempts(username, since);

        if (attempts.size() < MAX_FAILED_ATTEMPTS) {
            return 0;
        }

        // Find the oldest failed attempt in the lockout window
        LoginAttempt oldestAttempt = attempts.get(attempts.size() - 1);
        LocalDateTime lockoutEnd = oldestAttempt.getCreatedAt().plusMinutes(LOCKOUT_DURATION_MINUTES);
        long remainingMinutes = ChronoUnit.MINUTES.between(LocalDateTime.now(), lockoutEnd);

        return Math.max(0, remainingMinutes);
    }

    /**
     * Get login history for a user
     */
    @Transactional(readOnly = true)
    public Page<LoginAttempt> getLoginHistory(
            String username,
            LoginAttempt.LoginStatus status,
            String ipAddress,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {
        return loginAttemptRepository.findWithFilters(
                username, status, ipAddress, fromDate, toDate, pageable
        );
    }

    /**
     * Cleanup old login attempts (scheduled task)
     */
    @Transactional
    @Scheduled(cron = "0 0 3 * * *") // Daily at 3 AM
    public void cleanupOldAttempts() {
        // Keep login attempts for 90 days
        LocalDateTime before = LocalDateTime.now().minusDays(90);
        int deleted = loginAttemptRepository.deleteOldAttempts(before);
        log.info("Cleaned up {} old login attempts", deleted);
    }
}
