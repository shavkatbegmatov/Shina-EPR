package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
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

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

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

            // Create session in database (refresh token hashi ham bog'lanadi)
            LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(jwtExpiration / 1000);
            Session session = sessionService.createSession(
                userDetails.getUser(),
                accessToken,
                refreshToken,
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

    /**
     * BITTA tranzaksiya: sessiya qatori {@code FOR UPDATE} bilan o'qiladi va rotatsiya
     * shu qulf ostida yoziladi. Ilgari o'qish va yozish ikki alohida tranzaksiya edi —
     * bir xil refresh token bilan kelgan ikki parallel so'rov ikkalasi ham tirik sessiyani
     * ko'rib, ikkalasi ham rotatsiya qilib ketardi; o'g'irlangan tokenni aniqlash
     * ({@code revokeIfRefreshTokenReused}) hech qachon ishlamasdi.
     *
     * <p>{@code noRollbackFor}: rad etish istisnolari (401) tranzaksiyani QAYTARMASLIGI
     * kerak — reuse-detection va mutlaq muddat tugashi sessiyani yopib qo'yadi, bu yozuv
     * istisno bilan birga saqlanib qolishi shart.
     */
    @Transactional(noRollbackFor = {ResponseStatusException.class, AccountDisabledException.class})
    public JwtResponse refreshToken(String refreshToken, String ipAddress, String userAgent) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token yaroqsiz");
        }

        // Endpoint faqat HAQIQIY staff refresh tokenini qabul qiladi. Ilgari
        // istalgan imzolangan JWT (access token, mijoz tokeni, sessiyasi bekor
        // qilingan token) o'tar edi — bu sessiya bekor qilishni chetlab o'tish
        // yo'li edi.
        if (tokenProvider.isCustomerToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token yaroqsiz");
        }

        // Refresh faqat TIRIK sessiya bilan ishlaydi. Ilgari refresh tokenlar
        // server tomonida hech qayerda saqlanmasdi: logout, admin revoke,
        // hatto parol almashtirish ham qo'ldagi 7 kunlik refresh tokenni
        // o'ldirmasdi — har refresh yana yangi 7 kunlik berar, kirish amalda
        // cheksiz uzayardi. Endi barcha revocation yo'llari sessiyani
        // o'chirgani zahoti refresh ham to'xtaydi.
        Session session = sessionService.findActiveSessionByRefreshToken(refreshToken)
                .orElse(null);
        if (session == null) {
            // Rotatsiyadan chiqqan eski token qayta kelsa — o'g'irlangan
            // bo'lishi mumkin: butun sessiya (yangi juftlik bilan birga)
            // bekor qilinadi.
            sessionService.revokeIfRefreshTokenReused(refreshToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token yaroqsiz");
        }

        // Mutlaq muddat: rotatsiya har safar yangi 7 kunlik JWT beradi —
        // usiz kunda bir yangilab turgan qurilma ABADIY kirishda qolardi.
        // Qurilma birinchi login'dan refresh-expiration o'tgach to'liq
        // qayta kiradi.
        LocalDateTime familyDeadline = session.getCreatedAt().plusSeconds(refreshExpiration / 1000);
        if (LocalDateTime.now().isAfter(familyDeadline)) {
            sessionService.expireSessionFamily(session);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Sessiya muddati tugadi — qayta kiring");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsernameWithRolesAndPermissions(username)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "username", username));

        // Deaktivatsiya qilingan hisob yangi token (va u bilan birga
        // to'liq user/permission ma'lumotini) ololmasligi kerak — aks
        // holda bo'shatilgan xodim refresh orqali kirishni refresh-token
        // muddati davomida uzaytirib yura olardi.
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new AccountDisabledException("Akkaunt faol emas");
        }

        CustomUserDetails userDetails = new CustomUserDetails(user);

        String newAccessToken = tokenProvider.generateStaffTokenWithPermissions(
                username,
                user.getId(),
                userDetails.getRoleCodes(),
                userDetails.getPermissions()
        );
        String newRefreshToken = tokenProvider.generateStaffRefreshToken(username, user.getId());

        // Yangi juftlik AYNI SHU sessiya qatorida rotatsiya qilinadi: eski
        // access hash almashgani zahoti filtrda o'tmay qoladi, eski refresh
        // esa previous_* ga ko'chib, qayta ishlatilsa sessiyani yopadi.
        sessionService.rotateSessionTokens(session, newAccessToken, newRefreshToken,
                LocalDateTime.now().plusSeconds(jwtExpiration / 1000));

        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .user(UserResponse.from(user))
                .permissions(userDetails.getPermissions())
                .roles(userDetails.getRoleCodes())
                .build();
    }

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return UserResponse.from(userDetails.getUser());
    }
}
