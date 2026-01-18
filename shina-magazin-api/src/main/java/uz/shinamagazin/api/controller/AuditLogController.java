package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.AuditLogResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.AuditLogService;
import uz.shinamagazin.api.service.export.ExcelExportService;
import uz.shinamagazin.api.service.export.PdfExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Audit loglar API")
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

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

    @GetMapping("/export")
    @Operation(summary = "Export audit logs", description = "Audit loglarni Excel yoki PDF formatida eksport qilish")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<Resource> exportAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords
    ) {
        try {
            // Fetch audit logs with filters (limit to maxRecords for safety)
            Pageable pageable = Pageable.ofSize(maxRecords).withSort(Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<AuditLogResponse> auditLogsPage = auditLogService.searchAuditLogs(
                    entityType, action, userId, search, pageable
            );
            List<AuditLogResponse> auditLogs = auditLogsPage.getContent();

            ByteArrayOutputStream outputStream;
            String contentType;
            String filename;

            if ("pdf".equalsIgnoreCase(format)) {
                outputStream = pdfExportService.exportAuditLogs(auditLogs, "Tizim Auditlari Hisoboti");
                contentType = "application/pdf";
                filename = "audit_logs_" + LocalDate.now() + ".pdf";
            } else {
                outputStream = excelExportService.exportAuditLogs(auditLogs, "Tizim Auditlari Hisoboti");
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "audit_logs_" + LocalDate.now() + ".xlsx";
            }

            ByteArrayResource resource = new ByteArrayResource(outputStream.toByteArray());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(resource.contentLength())
                    .body(resource);
        } catch (Exception e) {
            throw new RuntimeException("Eksport qilishda xatolik: " + e.getMessage(), e);
        }
    }
}
