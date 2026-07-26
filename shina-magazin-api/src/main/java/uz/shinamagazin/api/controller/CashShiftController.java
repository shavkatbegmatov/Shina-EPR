package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.CloseShiftRequest;
import uz.shinamagazin.api.dto.request.OpenShiftRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CashShiftResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ZReportResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.CashShiftService;

/**
 * Kassa smenasi — ochish, yopish (Z-hisobot bilan) va tarix.
 *
 * <p>Smena har doim CHAQIRUVCHINING o'ziniki: `openShift`/`closeShift`
 * foydalanuvchi ID'sini so'rovdan emas, `@AuthenticationPrincipal` dan oladi.
 * Aks holda bir kassir boshqasining smenasini yopib, kamomadni unga
 * yozib qo'ya olardi.
 */
@RestController
@RequestMapping("/v1/shifts")
@RequiredArgsConstructor
@Tag(name = "Cash Shifts", description = "Kassa smenasi va Z-hisobot")
public class CashShiftController {

    private final CashShiftService cashShiftService;

    @GetMapping("/current")
    @Operation(summary = "Current shift", description = "Joriy foydalanuvchining ochiq smenasi (bo'lmasa null)")
    @RequiresPermission(PermissionCode.SHIFTS_VIEW)
    public ResponseEntity<ApiResponse<CashShiftResponse>> getCurrent(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                cashShiftService.getCurrentShift(userDetails.getId()).orElse(null)));
    }

    @PostMapping("/open")
    @Operation(summary = "Open shift", description = "Smena ochish (boshlang'ich kassa qoldig'i bilan)")
    @RequiresPermission(PermissionCode.SHIFTS_MANAGE)
    public ResponseEntity<ApiResponse<CashShiftResponse>> open(
            @Valid @RequestBody OpenShiftRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Smena ochildi",
                cashShiftService.openShift(userDetails.getId(), request)));
    }

    @PostMapping("/close")
    @Operation(summary = "Close shift", description = "Smenani yopish va Z-hisobot olish")
    @RequiresPermission(PermissionCode.SHIFTS_MANAGE)
    public ResponseEntity<ApiResponse<ZReportResponse>> close(
            @Valid @RequestBody CloseShiftRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Smena yopildi",
                cashShiftService.closeShift(userDetails.getId(), request)));
    }

    @GetMapping("/{id}/report")
    @Operation(summary = "Z-report", description = "Smena bo'yicha Z-hisobot")
    @RequiresPermission(PermissionCode.SHIFTS_VIEW)
    public ResponseEntity<ApiResponse<ZReportResponse>> report(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cashShiftService.getReport(id)));
    }

    @GetMapping
    @Operation(summary = "Shift history", description = "Smenalar tarixi")
    @RequiresPermission(PermissionCode.SHIFTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<CashShiftResponse>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PagedResponse.from(cashShiftService.getShifts(pageable))));
    }
}
