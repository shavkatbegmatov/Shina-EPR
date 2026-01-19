package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CredentialsInfo;
import uz.shinamagazin.api.dto.response.UserActivityResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.AuditLogService;
import uz.shinamagazin.api.service.UserService;
import uz.shinamagazin.api.service.export.ExcelExportService;
import uz.shinamagazin.api.service.export.PdfExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller for user management operations.
 * Used by admins to reset passwords and manage user accounts.
 */
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Foydalanuvchilar boshqaruvi API")
public class UserController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

    @PutMapping("/{id}/reset-password")
    @Operation(summary = "Reset user password", description = "Foydalanuvchi parolini reset qilish (admin)")
    @RequiresPermission(PermissionCode.USERS_UPDATE)
    public ResponseEntity<ApiResponse<CredentialsInfo>> resetPassword(@PathVariable Long id) {
        CredentialsInfo credentials = userService.resetPassword(id);
        return ResponseEntity.ok(ApiResponse.success("Parol reset qilindi", credentials));
    }

    @PutMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate user", description = "Foydalanuvchini o'chirish")
    @RequiresPermission(PermissionCode.USERS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Foydalanuvchi o'chirildi"));
    }

    @PutMapping("/{id}/activate")
    @Operation(summary = "Activate user", description = "Foydalanuvchini aktivlashtirish")
    @RequiresPermission(PermissionCode.USERS_UPDATE)
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Foydalanuvchi aktivlashtirildi"));
    }

    @GetMapping("/{userId}/activity")
    @Operation(summary = "Get user activity history", description = "Foydalanuvchi faoliyat tarixini olish")
    @RequiresPermission(PermissionCode.USERS_VIEW)
    public ResponseEntity<ApiResponse<Page<UserActivityResponse>>> getUserActivity(
            @PathVariable Long userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<UserActivityResponse> activity = auditLogService.getUserActivity(
                userId, entityType, action, startDate, endDate, pageable
        );
        return ResponseEntity.ok(ApiResponse.success(activity));
    }

    @GetMapping("/{userId}/activity/export")
    @Operation(summary = "Export user activity", description = "Foydalanuvchi faoliyat tarixini Excel yoki PDF formatida eksport qilish")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<Resource> exportUserActivity(
            @PathVariable Long userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords
    ) {
        try {
            // Fetch user activity with filters
            Pageable pageable = PageRequest.of(0, maxRecords, Sort.by(Sort.Direction.DESC, "createdAt"));

            Page<UserActivityResponse> activitiesPage = auditLogService.getUserActivity(
                    userId, entityType, action, startDate, endDate, pageable
            );

            List<UserActivityResponse> activities = activitiesPage.getContent();

            ByteArrayOutputStream outputStream;
            String contentType;
            String filename;

            if ("pdf".equalsIgnoreCase(format)) {
                outputStream = pdfExportService.exportUserActivity(activities, "Foydalanuvchi Faoliyati Hisoboti");
                contentType = "application/pdf";
                filename = "user_activity_" + userId + "_" + LocalDate.now() + ".pdf";
            } else {
                outputStream = excelExportService.exportUserActivity(activities, "Foydalanuvchi Faoliyati Hisoboti");
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "user_activity_" + userId + "_" + LocalDate.now() + ".xlsx";
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
