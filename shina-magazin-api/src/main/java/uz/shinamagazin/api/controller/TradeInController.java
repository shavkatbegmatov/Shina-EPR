package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.TradeInStatus;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.TradeInService;

import java.util.List;

/**
 * Barter hujjatlari — eski shinani savdodan ALOHIDA qabul qilish.
 *
 * <p>Savdo ichida qabul qilish uchun alohida chaqiruv kerak emas: POS barter
 * qatorlarini {@code POST /v1/sales} so'roviga qo'shib yuboradi (bitta
 * tranzaksiya). Bu yerdagi endpointlar mijoz shinasini QOLDIRIB ketgan holat
 * va hujjatlar ro'yxati uchun.
 */
@RestController
@RequestMapping("/v1/trade-ins")
@RequiredArgsConstructor
@Tag(name = "TradeIns", description = "Barter (eski shinani qabul qilish) API")
public class TradeInController {

    private final TradeInService tradeInService;

    @GetMapping
    @RequiresPermission(PermissionCode.TRADE_INS_VIEW)
    @Operation(summary = "List trade-ins", description = "Barter hujjatlari ro'yxati (holat va mijoz bo'yicha filtr)")
    public ResponseEntity<ApiResponse<PagedResponse<TradeInResponse>>> getAll(
            @RequestParam(required = false) TradeInStatus status,
            @RequestParam(required = false) Long customerId,
            @PageableDefault(size = 20, sort = "acceptedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<TradeInResponse> page = tradeInService.getAll(status, customerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(page)));
    }

    /** Kassada tanlash uchun: mijozning hali savdoga bog'lanmagan hujjatlari. */
    @GetMapping("/available")
    @RequiresPermission(PermissionCode.TRADE_INS_VIEW)
    @Operation(summary = "Available trade-ins", description = "Mijozning ishlatilmagan barter hujjatlari")
    public ResponseEntity<ApiResponse<List<TradeInResponse>>> getAvailable(@RequestParam Long customerId) {
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
    @Operation(summary = "Accept trade-in", description = "Eski shinalarni qabul qilish va baholash (savdodan alohida)")
    public ResponseEntity<ApiResponse<TradeInResponse>> accept(@Valid @RequestBody TradeInRequest request) {
        TradeInResponse created = tradeInService.accept(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Barter qabul qilindi", created));
    }

    // TRADE_INS_CANCEL ataylab alohida: bekor qilish omborga kirimni qaytaradi
    // va berilgan kreditni yo'q qiladi — SALES_REFUND bilan bir xil mulohaza.
    @PutMapping("/{id}/cancel")
    @RequiresPermission(PermissionCode.TRADE_INS_CANCEL)
    @Operation(summary = "Cancel trade-in", description = "Barterni bekor qilish (eski shinalar mijozga qaytariladi)")
    public ResponseEntity<ApiResponse<TradeInResponse>> cancel(@PathVariable Long id) {
        TradeInResponse cancelled = tradeInService.cancel(id);
        return ResponseEntity.ok(ApiResponse.success("Barter bekor qilindi", cancelled));
    }
}
