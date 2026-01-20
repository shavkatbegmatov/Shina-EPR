package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.request.SaleRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.SaleService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/sales")
@RequiredArgsConstructor
@Tag(name = "Sales", description = "Sotuvlar API")
public class SaleController {

    private final SaleService saleService;
    private final GenericExportService genericExportService;

    @GetMapping
    @RequiresPermission(PermissionCode.SALES_VIEW)
    @Operation(summary = "Get all sales", description = "Barcha sotuvlarni olish")
    public ResponseEntity<ApiResponse<PagedResponse<SaleResponse>>> getAllSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @PageableDefault(size = 20, sort = "saleDate") Pageable pageable) {
        Page<SaleResponse> sales = saleService.getAllSales(startDate, endDate, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(sales)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.SALES_VIEW)
    @Operation(summary = "Get sale by ID", description = "ID bo'yicha sotuvni olish")
    public ResponseEntity<ApiResponse<SaleResponse>> getSaleById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(saleService.getSaleById(id)));
    }

    @GetMapping("/today")
    @RequiresPermission(PermissionCode.SALES_VIEW)
    @Operation(summary = "Get today's sales", description = "Bugungi sotuvlar")
    public ResponseEntity<ApiResponse<List<SaleResponse>>> getTodaySales() {
        return ResponseEntity.ok(ApiResponse.success(saleService.getTodaySales()));
    }

    @GetMapping("/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export sales", description = "Sotuvlarni eksport qilish")
    public ResponseEntity<Resource> exportSales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords) {
        try {
            Pageable pageable = Pageable.ofSize(maxRecords);
            Page<SaleResponse> page = saleService.getAllSales(startDate, endDate, pageable);

            ByteArrayOutputStream output = genericExportService.export(
                    page.getContent(),
                    SaleResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Sotuvlar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "sales_" + LocalDate.now() + "." + extension;

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

    @PostMapping
    @RequiresPermission(PermissionCode.SALES_CREATE)
    @Operation(summary = "Create sale", description = "Yangi sotuv yaratish")
    public ResponseEntity<ApiResponse<SaleResponse>> createSale(
            @Valid @RequestBody SaleRequest request) {
        SaleResponse sale = saleService.createSale(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Sotuv muvaffaqiyatli yaratildi", sale));
    }

    @PutMapping("/{id}/cancel")
    @RequiresPermission(PermissionCode.SALES_UPDATE)
    @Operation(summary = "Cancel sale", description = "Sotuvni bekor qilish")
    public ResponseEntity<ApiResponse<SaleResponse>> cancelSale(@PathVariable Long id) {
        SaleResponse sale = saleService.cancelSale(id);
        return ResponseEntity.ok(ApiResponse.success("Sotuv bekor qilindi", sale));
    }
}
