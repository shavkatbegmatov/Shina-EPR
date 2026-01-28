package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.request.LoginRequest;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.dto.response.UserResponse;
import uz.shinamagazin.api.entity.LoginAttempt;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.AccountDisabledException;
import uz.shinamagazin.api.exception.AccountLockedException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.JwtTokenProvider;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final SessionService sessionService;
    private final LoginAttemptService loginAttemptService;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public JwtResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String username = request.getUsername();

        // Check if account is locked due to too many failed attempts
        if (loginAttemptService.isAccountLocked(username)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutTime(username);

            // Log failed attempt
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_LOCKED,
                "Account temporarily locked due to too many failed attempts. Try again in " + remainingMinutes + " minutes."
            );

            throw new AccountLockedException(
                "Akkaunt vaqtincha bloklandi. " + remainingMinutes + " daqiqadan so'ng urinib ko'ring."
            );
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long userId = userDetails.getUser().getId();

            // Generate token with permissions
            String accessToken = tokenProvider.generateStaffTokenWithPermissions(
                    userDetails.getUsername(),
                    userId,
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String refreshToken = tokenProvider.generateStaffRefreshToken(userDetails.getUsername(), userId);

            // Create session in database
            LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(jwtExpiration / 1000);
            Session session = sessionService.createSession(
                userDetails.getUser(),
                accessToken,
                ipAddress,
                userAgent,
                expiresAt
            );

            // Log successful login attempt
            loginAttemptService.logSuccessfulAttempt(username, ipAddress, userAgent, session);

            // Check if user must change password
            Boolean mustChangePassword = Boolean.TRUE.equals(userDetails.getUser().getMustChangePassword());

            return JwtResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .user(UserResponse.from(userDetails.getUser()))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .requiresPasswordChange(mustChangePassword)
                    .build();

        } catch (BadCredentialsException e) {
            // Log failed login attempt
            User user = userRepository.findByUsername(username).orElse(null);
            LoginAttempt.FailureReason reason = user == null
                    ? LoginAttempt.FailureReason.USER_NOT_FOUND
                    : LoginAttempt.FailureReason.INVALID_PASSWORD;

            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                reason,
                "Invalid username or password"
            );

            throw new BadCredentialsException("Noto'g'ri foydalanuvchi nomi yoki parol");

        } catch (DisabledException e) {
            // Log failed login for disabled account
            loginAttemptService.logFailedAttempt(
                username,
                ipAddress,
                userAgent,
                LoginAttempt.FailureReason.ACCOUNT_DISABLED,
                "Account is disabled"
            );

            throw new AccountDisabledException("Akkaunt faol emas");
        }
    }

    public JwtResponse refreshToken(String refreshToken) {
        if (tokenProvider.validateToken(refreshToken)) {
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsernameWithRolesAndPermissions(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "username", username));

            CustomUserDetails userDetails = new CustomUserDetails(user);

            String newAccessToken = tokenProvider.generateStaffTokenWithPermissions(
                    username,
                    user.getId(),
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String newRefreshToken = tokenProvider.generateStaffRefreshToken(username, user.getId());

            return JwtResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .user(UserResponse.from(user))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .build();
        }
        throw new RuntimeException("Refresh token yaroqsiz");
    }

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return UserResponse.from(userDetails.getUser());
    }
}
