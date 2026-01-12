package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PermissionResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.PermissionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/permissions")
@RequiredArgsConstructor
@Tag(name = "Permissions", description = "Huquqlar API")
public class PermissionController {

    private final PermissionService permissionService;

    @GetMapping
    @Operation(summary = "Get all permissions", description = "Barcha huquqlarni olish")
    @RequiresPermission(PermissionCode.ROLES_VIEW)
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.success(permissionService.getAllPermissions()));
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
