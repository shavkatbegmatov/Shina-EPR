package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
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

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Foydalanuvchi tizimga kirish")
    public ResponseEntity<ApiResponse<JwtResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        JwtResponse response = authService.login(request, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli kirish", response));
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

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
