package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.AuthService;
import uz.shinamagazin.api.service.UserService;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Autentifikatsiya API")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Foydalanuvchi tizimga kirish")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse response = authService.login(request);
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
}
