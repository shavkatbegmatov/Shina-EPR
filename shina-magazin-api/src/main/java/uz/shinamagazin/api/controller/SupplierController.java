package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.SupplierRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.SupplierResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.SupplierService;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/suppliers")
@RequiredArgsConstructor
@Tag(name = "Suppliers", description = "Ta'minotchilar API")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @Operation(summary = "Get all suppliers", description = "Barcha ta'minotchilarni olish")
    @RequiresPermission(PermissionCode.SUPPLIERS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<SupplierResponse>>> getAllSuppliers(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<SupplierResponse> suppliers;
        if (search != null && !search.isEmpty()) {
            suppliers = supplierService.searchSuppliers(search, pageable);
        } else {
            suppliers = supplierService.getAllSuppliers(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(suppliers)));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active suppliers", description = "Faol ta'minotchilar ro'yxati (dropdown uchun)")
    @RequiresPermission(PermissionCode.SUPPLIERS_VIEW)
    public ResponseEntity<ApiResponse<List<SupplierResponse>>> getActiveSuppliers() {
        return ResponseEntity.ok(ApiResponse.success(supplierService.getActiveSuppliers()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get supplier by ID", description = "ID bo'yicha ta'minotchini olish")
    @RequiresPermission(PermissionCode.SUPPLIERS_VIEW)
    public ResponseEntity<ApiResponse<SupplierResponse>> getSupplierById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(supplierService.getSupplierById(id)));
    }

    @GetMapping("/with-debt")
    @Operation(summary = "Get suppliers with debt", description = "Qarzli ta'minotchilar")
    @RequiresPermission(PermissionCode.SUPPLIERS_VIEW)
    public ResponseEntity<ApiResponse<List<SupplierResponse>>> getSuppliersWithDebt() {
        return ResponseEntity.ok(ApiResponse.success(supplierService.getSuppliersWithDebt()));
    }

    @GetMapping("/total-debt")
    @Operation(summary = "Get total debt", description = "Jami qarz summasi")
    @RequiresPermission(PermissionCode.SUPPLIERS_VIEW)
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalDebt() {
        return ResponseEntity.ok(ApiResponse.success(supplierService.getTotalDebt()));
    }

    @PostMapping
    @Operation(summary = "Create supplier", description = "Yangi ta'minotchi yaratish")
    @RequiresPermission(PermissionCode.SUPPLIERS_CREATE)
    public ResponseEntity<ApiResponse<SupplierResponse>> createSupplier(
            @Valid @RequestBody SupplierRequest request) {
        SupplierResponse supplier = supplierService.createSupplier(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ta'minotchi yaratildi", supplier));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update supplier", description = "Ta'minotchini yangilash")
    @RequiresPermission(PermissionCode.SUPPLIERS_UPDATE)
    public ResponseEntity<ApiResponse<SupplierResponse>> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request) {
        SupplierResponse supplier = supplierService.updateSupplier(id, request);
        return ResponseEntity.ok(ApiResponse.success("Ta'minotchi yangilandi", supplier));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete supplier", description = "Ta'minotchini o'chirish")
    @RequiresPermission(PermissionCode.SUPPLIERS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok(ApiResponse.success("Ta'minotchi o'chirildi"));
    }
}
