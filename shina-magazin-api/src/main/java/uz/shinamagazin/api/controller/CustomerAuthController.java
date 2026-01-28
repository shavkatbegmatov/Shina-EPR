package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.CustomerLoginRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CustomerAuthResponse;
import uz.shinamagazin.api.service.CustomerAuthService;

@RestController
@RequestMapping("/v1/customer-auth")
@RequiredArgsConstructor
@Tag(name = "Customer Authentication", description = "Mijoz portali autentifikatsiya API")
public class CustomerAuthController {

    private final CustomerAuthService customerAuthService;

    @PostMapping("/login")
    @Operation(summary = "Mijoz kirishi", description = "Telefon raqam va PIN kod bilan kirish")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> login(
            @Valid @RequestBody CustomerLoginRequest request) {
        CustomerAuthResponse response = customerAuthService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli kirish", response));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Token yangilash", description = "Refresh token orqali yangi access token olish")
    public ResponseEntity<ApiResponse<CustomerAuthResponse>> refreshToken(
            @RequestParam String refreshToken) {
        CustomerAuthResponse response = customerAuthService.refreshToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Chiqish", description = "Tizimdan chiqish")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // Client side token o'chirish yetarli
        return ResponseEntity.ok(ApiResponse.success("Muvaffaqiyatli chiqildi", null));
    }
}
