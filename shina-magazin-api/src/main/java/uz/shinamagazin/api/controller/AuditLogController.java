package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.AuditLogService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Audit loglar API")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Search audit logs", description = "Audit loglarni qidirish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> searchAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                auditLogService.searchAuditLogs(entityType, action, userId, search, pageable)
        ));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @Operation(summary = "Get entity audit logs", description = "Muayyan entity uchun audit loglarni olish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable Long entityId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                auditLogService.getEntityAuditLogs(entityType, entityId)
        ));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user audit logs", description = "Foydalanuvchi uchun audit loglarni olish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getUserAuditLogs(
            @PathVariable Long userId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                auditLogService.getAuditLogsByUser(userId, pageable)
        ));
    }

    @GetMapping("/date-range")
    @Operation(summary = "Get audit logs by date range", description = "Sana oralig'i bo'yicha audit loglarni olish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                auditLogService.getAuditLogsByDateRange(startDate, endDate, pageable)
        ));
    }

    @GetMapping("/entity-types")
    @Operation(summary = "Get all entity types", description = "Barcha entity turlarini olish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<List<String>>> getAllEntityTypes() {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getAllEntityTypes()));
    }

    @GetMapping("/actions")
    @Operation(summary = "Get all actions", description = "Barcha action turlarini olish")
    @RequiresPermission(PermissionCode.SETTINGS_VIEW)
    public ResponseEntity<ApiResponse<List<String>>> getAllActions() {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getAllActions()));
    }
}
