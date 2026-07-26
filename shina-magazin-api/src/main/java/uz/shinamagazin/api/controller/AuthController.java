package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.exception.AccountDisabledException;
import uz.shinamagazin.api.exception.AccountLockedException;
import uz.shinamagazin.api.security.ClientIp;
import uz.shinamagazin.api.security.SimpleRateLimiter;
import uz.shinamagazin.api.dto.request.ChangePasswordRequest;
import uz.shinamagazin.api.dto.request.LoginRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.dto.response.UserResponse;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.AuthService;
import uz.shinamagazin.api.service.SessionService;
import uz.shinamagazin.api.service.UserService;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Autentifikatsiya API")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final SessionService sessionService;
    private final SimpleRateLimiter rateLimiter;

    /**
     * IP bo'yicha login throttle.
     *
     * <p>Mavjud himoya faqat FOYDALANUVCHI NOMI bo'yicha edi (LoginAttemptService:
     * 5 urinish / 30 daqiqa). U bitta akkauntga parol tanlashni to'sadi, lekin
     * credential stuffing'ni to'smaydi: hujumchi bitta parolni minglab turli
     * foydalanuvchi nomiga sinab ko'rsa, hech bir akkaunt 5 chegarasiga
     * yetmaydi va urinishlar cheksiz davom etadi.
     *
     * <p>Chegara ataylab bo'sh qo'yilgan (30/15 daqiqa): bitta ofis IP'si ortida
     * o'nlab xodim bo'lishi mumkin. Muhimi — faqat MUVAFFAQIYATSIZ urinishlar
     * hisoblanadi va muvaffaqiyatli kirish byudjetni tozalaydi, ya'ni normal
     * foydalanuvchi hech qachon bloklanmaydi.
     */
    private static final int LOGIN_MAX_FAILURES_PER_IP = 30;
    private static final long LOGIN_WINDOW_MS = 15 * 60_000;

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Foydalanuvchi tizimga kirish")
    public ResponseEntity<ApiResponse<JwtResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        String throttleKey = "login:" + ipAddress;

        if (rateLimiter.isBlocked(throttleKey, LOGIN_MAX_FAILURES_PER_IP, LOGIN_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p muvaffaqiyatsiz urinish. 15 daqiqadan keyin qayta urinib ko'ring.");
        }

        try {
            JwtResponse response = authService.login(request, ipAddress, userAgent);
            // Muvaffaqiyat — byudjet tozalanadi, aks holda kun davomida
            // to'plangan tasodifiy xatolar ofisni bloklab qo'yardi.
            rateLimiter.reset(throttleKey);
            return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli kirish", response));
        } catch (AuthenticationException | AccountLockedException | AccountDisabledException e) {
            // Faqat AUTENTIFIKATSIYA xatolari hisoblanadi. Infratuzilma xatosi
            // (masalan DB uzilishi) hisoblanmasligi kerak — aks holda baza
            // tiklangach barcha xodim 15 daqiqa kira olmasdi.
            rateLimiter.recordFailure(throttleKey, LOGIN_WINDOW_MS);
            throw e;
        }
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh Token", description = "Token yangilash")
    public ResponseEntity<ApiResponse<JwtResponse>> refreshToken(@RequestParam String refreshToken) {
        JwtResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/me")
    @Operation(summary = "Current User", description = "Joriy foydalanuvchi ma'lumotlari")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        UserResponse response = authService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Tizimdan chiqish va joriy sessionni bekor qilish")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader("Authorization") String authHeader
    ) {
        String currentToken = authHeader.substring(7); // Remove "Bearer "

        // Find and revoke current session
        Session currentSession = sessionService.getSessionByToken(currentToken).orElse(null);

        if (currentSession != null) {
            // Revoke session WITH notification to update other devices' session lists
            // Frontend handles intentional logout flag to prevent showing error message to the user
            sessionService.revokeSession(
                currentSession.getId(),
                userDetails.getUser().getId(),
                "User logged out",
                true  // Send notification so other devices can refresh their session lists
            );
        }

        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli chiqish"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Parolni o'zgartirish")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        // Validate password confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Yangi parol va tasdiqlash mos kelmadi"));
        }

        userService.changePassword(
                userDetails.getId(),
                request.getCurrentPassword(),
                request.getNewPassword()
        );

        return ResponseEntity.ok(ApiResponse.success("Parol muvaffaqiyatli o'zgartirildi"));
    }

    /** @see ClientIp — mantiq bir joyga yig'ildi (ilgari 3 joyda, turlicha edi). */
    private String getClientIpAddress(HttpServletRequest request) {
        return ClientIp.of(request);
    }
}
