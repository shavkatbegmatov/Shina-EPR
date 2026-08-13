package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.request.StaffRegistrationApproveRequest;
import uz.shinamagazin.api.dto.request.StaffRegistrationSubmitRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.StaffRegistrationResponse;
import uz.shinamagazin.api.dto.response.StaffRegistrationSubmitResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;
import uz.shinamagazin.api.security.ClientIp;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.security.SimpleRateLimiter;
import uz.shinamagazin.api.service.StaffRegistrationService;

import java.util.Map;

/**
 * Xodimlikka ro'yxatdan o'tish so'rovlari.
 *
 * <p>Yuborish OMMAVIY (`/admin/register` sahifasidan, autentifikatsiyasiz),
 * ko'rish va qaror qabul qilish esa xodim huquqini talab qiladi. Yangi
 * ruxsat turi ATAYLAB kiritilmadi: tasdiqlash aslida xodim yaratish, ya'ni
 * {@code EMPLOYEES_CREATE} semantik jihatdan aynan mos keladi.
 */
@RestController
@RequestMapping("/v1/staff-registration")
@RequiredArgsConstructor
@Tag(name = "Staff Registration", description = "Xodimlikka ro'yxatdan o'tish so'rovlari")
public class StaffRegistrationController {

    /**
     * Bitta IP'dan soatiga 5 ta so'rov.
     *
     * <p>Endpoint ommaviy va har bir so'rov bazaga yozuv qo'shadi hamda
     * xodimlarga bildirishnoma yuboradi (Telegram ham). Chegarasiz bo'lsa,
     * oddiy skript xodimlarning navbatini ham, Telegram kanalini ham
     * bir necha daqiqada to'ldirib yuborardi.
     */
    private static final int SUBMIT_MAX_PER_IP = 5;
    private static final long SUBMIT_WINDOW_MS = 60 * 60_000;

    private final StaffRegistrationService service;
    private final SimpleRateLimiter rateLimiter;

    @PostMapping
    @Operation(summary = "So'rov yuborish", description = "Ommaviy — xodimlikka ariza")
    public ResponseEntity<ApiResponse<StaffRegistrationSubmitResponse>> submit(
            @Valid @RequestBody StaffRegistrationSubmitRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = ClientIp.of(httpRequest);
        if (!rateLimiter.allow("staff-registration:" + clientIp, SUBMIT_MAX_PER_IP, SUBMIT_WINDOW_MS)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p so'rov yuborildi. Bir soatdan keyin qayta urinib ko'ring.");
        }

        return ResponseEntity.ok(ApiResponse.success(
                "So'rovingiz qabul qilindi. Administrator ko'rib chiqqach, siz bilan bog'lanamiz.",
                service.submit(request, clientIp)));
    }

    @GetMapping
    @RequiresPermission(PermissionCode.EMPLOYEES_VIEW)
    @Operation(summary = "So'rovlar ro'yxati")
    public ResponseEntity<ApiResponse<PagedResponse<StaffRegistrationResponse>>> list(
            @RequestParam(required = false) StaffRegistrationStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PagedResponse.from(service.list(status, pageable))));
    }

    @GetMapping("/pending-count")
    @RequiresPermission(PermissionCode.EMPLOYEES_VIEW)
    @Operation(summary = "Ko'rib chiqilmagan so'rovlar soni")
    public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount() {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", service.pendingCount())));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(PermissionCode.EMPLOYEES_CREATE)
    @Operation(summary = "Tasdiqlash",
            description = "Xodim va akkaunt yaratiladi; javobda bir martalik kredensiallar")
    public ResponseEntity<ApiResponse<EmployeeResponse>> approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) StaffRegistrationApproveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "So'rov tasdiqlandi", service.approve(id, request)));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(PermissionCode.EMPLOYEES_CREATE)
    @Operation(summary = "Rad etish")
    public ResponseEntity<ApiResponse<StaffRegistrationResponse>> reject(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success(
                "So'rov rad etildi", service.reject(id, reason)));
    }
}
