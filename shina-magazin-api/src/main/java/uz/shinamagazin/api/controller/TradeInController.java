package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.TradeInStatus;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.TradeInService;

import java.util.List;

/**
 * Barter — eski shinani qabul qilish va baholash.
 *
 * <p>Savdo ichida qabul qilish uchun alohida chaqiruv kerak emas: POS
 * {@code POST /v1/sales} so'roviga barterni qo'shib yuboradi. Bu yerdagi
 * endpointlar mijoz shinasini QOLDIRIB ketgan holat uchun.
 */
@RestController
@RequestMapping("/v1/trade-ins")
@RequiredArgsConstructor
@Tag(name = "TradeIns", description = "Barter (eski shinani hisobga olish) API")
public class TradeInController {

    private final TradeInService tradeInService;

    @GetMapping
    @RequiresPermission(PermissionCode.TRADE_INS_VIEW)
    @Operation(summary = "List trade-ins", description = "Barter hujjatlari ro'yxati")
    public ResponseEntity<ApiResponse<PagedResponse<TradeInResponse>>> getAll(
            @RequestParam(required = false) TradeInStatus status,
            @PageableDefault(size = 20, sort = "acceptedAt") Pageable pageable) {
        Page<TradeInResponse> page = tradeInService.getAll(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(page)));
    }

    /** Kassada tanlash uchun: hali savdoga bog'lanmagan hujjatlar. */
    @GetMapping("/available")
    @RequiresPermission(PermissionCode.TRADE_INS_VIEW)
    @Operation(summary = "Available trade-ins", description = "Ishlatilmagan barter hujjatlari")
    public ResponseEntity<ApiResponse<List<TradeInResponse>>> getAvailable(
            @RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(tradeInService.getAvailable(customerId)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.TRADE_INS_VIEW)
    @Operation(summary = "Get trade-in", description = "Barter hujjati")
    public ResponseEntity<ApiResponse<TradeInResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(tradeInService.getById(id)));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.TRADE_INS_CREATE)
    @Operation(summary = "Accept trade-in", description = "Eski shinalarni qabul qilish va baholash")
    public ResponseEntity<ApiResponse<TradeInResponse>> accept(
            @Valid @RequestBody TradeInRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        TradeInResponse created = tradeInService.accept(request, userDetails.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Barter qabul qilindi", created));
    }

    // TRADE_INS_CANCEL ataylab alohida: bekor qilish omborga kirimni qaytaradi
    // va baholangan summani yo'q qiladi — SALES_REFUND bilan bir xil mulohaza.
    @PutMapping("/{id}/cancel")
    @RequiresPermission(PermissionCode.TRADE_INS_CANCEL)
    @Operation(summary = "Cancel trade-in", description = "Barterni bekor qilish (kirim qaytariladi)")
    public ResponseEntity<ApiResponse<TradeInResponse>> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        TradeInResponse cancelled = tradeInService.cancel(id, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Barter bekor qilindi", cancelled));
    }
}
