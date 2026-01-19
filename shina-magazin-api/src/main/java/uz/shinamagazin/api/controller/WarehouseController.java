package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.request.StockAdjustmentRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ProductResponse;
import uz.shinamagazin.api.dto.response.StockMovementResponse;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.ProductService;
import uz.shinamagazin.api.service.StockMovementService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/warehouse")
@RequiredArgsConstructor
@Tag(name = "Warehouse", description = "Ombor va zaxira API")
public class WarehouseController {

    private final StockMovementService stockMovementService;
    private final ProductService productService;
    private final GenericExportService<StockMovementResponse> genericExportService;

    @GetMapping("/stats")
    @Operation(summary = "Get warehouse stats", description = "Ombor statistikasini olish")
    @RequiresPermission(PermissionCode.WAREHOUSE_VIEW)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWarehouseStats() {
        return ResponseEntity.ok(ApiResponse.success(stockMovementService.getWarehouseStats()));
    }

    @GetMapping("/movements")
    @Operation(summary = "Get all stock movements", description = "Barcha zaxira harakatlarini olish")
    @RequiresPermission(PermissionCode.WAREHOUSE_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<StockMovementResponse>>> getAllMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) MovementType movementType,
            @RequestParam(required = false) String referenceType,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<StockMovementResponse> movements;
        if (productId != null || movementType != null || referenceType != null) {
            movements = stockMovementService.getMovementsWithFilters(productId, movementType, referenceType, pageable);
        } else {
            movements = stockMovementService.getAllMovements(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(movements)));
    }

    @GetMapping("/movements/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export stock movements", description = "Zaxira harakatlarini eksport qilish")
    public ResponseEntity<Resource> exportStockMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) MovementType movementType,
            @RequestParam(required = false) String referenceType,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords) {
        try {
            Pageable pageable = Pageable.ofSize(maxRecords);
            Page<StockMovementResponse> page;

            if (productId != null || movementType != null || referenceType != null) {
                page = stockMovementService.getMovementsWithFilters(productId, movementType, referenceType, pageable);
            } else {
                page = stockMovementService.getAllMovements(pageable);
            }

            ByteArrayOutputStream output = genericExportService.export(
                    page.getContent(),
                    StockMovementResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Zaxira Harakatlari Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "stock_movements_" + LocalDate.now() + "." + extension;

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

    @GetMapping("/movements/{id}")
    @Operation(summary = "Get movement by ID", description = "ID bo'yicha harakatni olish")
    @RequiresPermission(PermissionCode.WAREHOUSE_VIEW)
    public ResponseEntity<ApiResponse<StockMovementResponse>> getMovementById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(stockMovementService.getMovementById(id)));
    }

    @GetMapping("/movements/product/{productId}")
    @Operation(summary = "Get product movements", description = "Mahsulot harakatlarini olish")
    @RequiresPermission(PermissionCode.WAREHOUSE_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<StockMovementResponse>>> getProductMovements(
            @PathVariable Long productId,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<StockMovementResponse> movements = stockMovementService.getProductMovements(productId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(movements)));
    }

    @PostMapping("/adjustment")
    @Operation(summary = "Create stock adjustment", description = "Zaxirani sozlash (kirim/chiqim/tuzatish)")
    @RequiresPermission(PermissionCode.WAREHOUSE_ADJUST)
    public ResponseEntity<ApiResponse<StockMovementResponse>> createStockAdjustment(
            @Valid @RequestBody StockAdjustmentRequest request) {

        StockMovementResponse movement = stockMovementService.createStockAdjustment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Zaxira muvaffaqiyatli yangilandi", movement));
    }

    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock products", description = "Kam zaxiradagi mahsulotlar")
    @RequiresPermission(PermissionCode.WAREHOUSE_VIEW)
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getLowStockProducts() {
        return ResponseEntity.ok(ApiResponse.success(productService.getLowStockProducts()));
    }
}
