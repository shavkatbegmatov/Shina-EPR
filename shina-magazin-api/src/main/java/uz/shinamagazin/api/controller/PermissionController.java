package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PermissionResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.PermissionService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/permissions")
@RequiredArgsConstructor
@Tag(name = "Permissions", description = "Huquqlar API")
public class PermissionController {

    private final PermissionService permissionService;
    private final GenericExportService genericExportService;

    @GetMapping
    @Operation(summary = "Get all permissions", description = "Barcha huquqlarni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getAllPermissions()));
    }

    @GetMapping("/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export permissions", description = "Huquqlarni eksport qilish")
    public ResponseEntity<Resource> exportPermissions(
            @RequestParam(defaultValue = "excel") String format) {
        try {
            List<PermissionResponse> permissions = permissionService.getAllPermissions();

            ByteArrayOutputStream output = genericExportService.export(
                    permissions,
                    PermissionResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Ruxsatlar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "permissions_" + LocalDate.now() + "." + extension;

            ByteArrayResource resource = new ByteArrayResource(output.toByteArray());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(resource.contentLength())
                    .body(resource);

        } catch (Exception e) {
            throw new RuntimeException("Eksport qilishda xatolik: " + e.getMessage(), e);
        }
    }

    @GetMapping("/grouped")
    @Operation(summary = "Get all permissions grouped by module", description = "Modul bo'yicha guruhlangan huquqlarni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<Map<String, List<PermissionResponse>>>> getAllPermissionsGrouped() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getAllPermissionsGrouped()));
    }

    @GetMapping("/modules")
    @Operation(summary = "Get all modules", description = "Barcha modullarni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<List<String>>> getAllModules() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getAllModules()));
    }
}
