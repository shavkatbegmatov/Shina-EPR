package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.PurchaseReturnResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.PurchaseService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;

@RestController
@RequestMapping("/v1/purchase-returns")
@RequiredArgsConstructor
@Tag(name = "Purchase Returns", description = "Xarid qaytarishlari API")
public class PurchaseReturnController {

    private final PurchaseService purchaseService;
    private final GenericExportService<PurchaseReturnResponse> genericExportService;

    @GetMapping
    @Operation(summary = "Get all returns", description = "Barcha qaytarishlarni olish")
    @RequiresPermission(PermissionCode.PURCHASES_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<PurchaseReturnResponse>>> getAllReturns(
            @RequestParam(required = false) PurchaseReturnStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<PurchaseReturnResponse> returns = purchaseService.getAllReturns(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(returns)));
    }

    @GetMapping("/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export purchase returns", description = "Xarid qaytarishlarni eksport qilish")
    public ResponseEntity<Resource> exportPurchaseReturns(
            @RequestParam(required = false) PurchaseReturnStatus status,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords) {
        try {
            Pageable pageable = Pageable.ofSize(maxRecords);
            Page<PurchaseReturnResponse> page = purchaseService.getAllReturns(status, pageable);

            ByteArrayOutputStream output = genericExportService.export(
                    page.getContent(),
                    PurchaseReturnResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Xarid Qaytarishlari Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "purchase_returns_" + LocalDate.now() + "." + extension;

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

    @GetMapping("/{id}")
    @Operation(summary = "Get return by ID", description = "ID bo'yicha qaytarishni olish")
    @RequiresPermission(PermissionCode.PURCHASES_VIEW)
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> getReturnById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getReturnById(id)));
    }

    @PutMapping("/{id}/approve")
    @Operation(summary = "Approve return", description = "Qaytarishni tasdiqlash")
    @RequiresPermission(PermissionCode.PURCHASES_RETURN)
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> approveReturn(@PathVariable Long id) {
        PurchaseReturnResponse returnResponse = purchaseService.approveReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish tasdiqlandi", returnResponse));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Complete return", description = "Qaytarishni yakunlash (ombor va balans yangilanadi)")
    @RequiresPermission(PermissionCode.PURCHASES_RETURN)
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> completeReturn(@PathVariable Long id) {
        PurchaseReturnResponse returnResponse = purchaseService.completeReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish yakunlandi", returnResponse));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete return", description = "Qaytarishni o'chirish (faqat PENDING)")
    @RequiresPermission(PermissionCode.PURCHASES_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteReturn(@PathVariable Long id) {
        purchaseService.deleteReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish o'chirildi"));
    }
}
