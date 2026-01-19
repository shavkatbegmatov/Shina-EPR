package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.request.SettingsUpdateRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.SettingsResponse;
import uz.shinamagazin.api.service.SettingsService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.Collections;

@RestController
@RequestMapping("/v1/settings")
@RequiredArgsConstructor
@Tag(name = "Settings", description = "Tizim sozlamalari")
public class SettingsController {

    private final SettingsService settingsService;
    private final GenericExportService<SettingsResponse> genericExportService;

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_SETTINGS_VIEW')")
    @Operation(summary = "Get settings", description = "Tizim sozlamalarini olish")
    public ResponseEntity<ApiResponse<SettingsResponse>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(settingsService.getSettings()));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('PERM_REPORTS_EXPORT')")
    @Operation(summary = "Export settings", description = "Tizim sozlamalarini eksport qilish")
    public ResponseEntity<Resource> exportSettings(
            @RequestParam(defaultValue = "excel") String format) {
        try {
            SettingsResponse settings = settingsService.getSettings();

            ByteArrayOutputStream output = genericExportService.export(
                    Collections.singletonList(settings),
                    SettingsResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Sozlamalar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "settings_" + LocalDate.now() + "." + extension;

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

    @PutMapping
    @PreAuthorize("hasAuthority('PERM_SETTINGS_UPDATE')")
    @Operation(summary = "Update settings", description = "Tizim sozlamalarini yangilash")
    public ResponseEntity<ApiResponse<SettingsResponse>> updateSettings(
            @Valid @RequestBody SettingsUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Sozlamalar yangilandi", settingsService.updateSettings(request)));
    }
}
