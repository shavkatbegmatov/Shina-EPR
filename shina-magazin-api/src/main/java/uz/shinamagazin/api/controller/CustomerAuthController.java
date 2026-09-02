package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.request.CustomerLoginRequest;
import uz.shinamagazin.api.dto.request.RefreshTokenRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CustomerAuthResponse;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.security.ClientIp;
import uz.shinamagazin.api.security.SimpleRateLimiter;
import uz.shinamagazin.api.service.CustomerAuthService;

@RestController
@RequestMapping("/v1/customer-auth")
@RequiredArgsConstructor
@Tag(name = "Customer Authentication", description = "Mijoz portali autentifikatsiya API")
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;
    private final SimpleRateLimiter rateLimiter;

    /**
     * IP bo'yicha throttle. Mijoz PIN'i atigi 4 xonali (10 000 kombinatsiya),
     * shuning uchun har bir mijozdagi urinish chegarasidan tashqari IP darajasi
     * ham kerak — aks holda hujumchi telefon raqamlarni aylanib chiqib, har biri
     * uchun bir necha PIN sinab ko'rishi mumkin edi.
     *
     * <p>Faqat muvaffaqiyatsiz urinishlar hisoblanadi: mobil operator NAT'i
     * ortida ko'plab haqiqiy mijoz bitta IP'ni bo'lishishi mumkin.
     */
    private static final int LOGIN_MAX_FAILURES_PER_IP = 30;
    private static final long LOGIN_WINDOW_MS = 15 * 60_000;

    @PostMapping("/login")
    @Operation(summary = "Mijoz kirishi", description = "Telefon raqam va PIN kod bilan kirish")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> login(
            @Valid @RequestBody CustomerLoginRequest request,
            HttpServletRequest httpRequest) {

        String throttleKey = "customer-login:" + ClientIp.of(httpRequest);

        if (rateLimiter.isBlocked(throttleKey, LOGIN_MAX_FAILURES_PER_IP, LOGIN_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p muvaffaqiyatsiz urinish. 15 daqiqadan keyin qayta urinib ko'ring.");
        }

        try {
            CustomerAuthResponse response = customerAuthService.login(request);
            rateLimiter.reset(throttleKey);
            return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli kirish", response));
        } catch (BadRequestException e) {
            // CustomerAuthService noto'g'ri PIN / bloklangan akkaunt uchun shuni tashlaydi.
            // Infratuzilma xatolari (DB va h.k.) bu yerga tushmaydi — hisoblanmaydi.
            rateLimiter.recordFailure(throttleKey, LOGIN_WINDOW_MS);
            throw e;
        }
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Token yangilash",
            description = "Refresh token orqali yangi access token olish — token JSON body'da")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest body,
            @RequestParam(required = false) String refreshToken,
            HttpServletRequest httpRequest) {
        String token = RefreshTokenRequest.resolve(body, refreshToken);
        String throttleKey = "customer-refresh:" + ClientIp.of(httpRequest);

        if (rateLimiter.isBlocked(throttleKey, LOGIN_MAX_FAILURES_PER_IP, LOGIN_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
        }

        try {
            CustomerAuthResponse response = customerAuthService.refreshToken(token);
            rateLimiter.reset(throttleKey);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (BadRequestException e) {
            rateLimiter.recordFailure(throttleKey, LOGIN_WINDOW_MS);
            throw e;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Chiqish", description = "Tizimdan chiqish")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // Client side token o'chirish yetarli
        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli chiqildi", null));
    }
}
