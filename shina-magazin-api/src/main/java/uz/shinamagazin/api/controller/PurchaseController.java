package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.PurchaseRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.PurchaseOrderResponse;
import uz.shinamagazin.api.dto.response.PurchaseStatsResponse;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.service.PurchaseService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/purchases")
@RequiredArgsConstructor
@Tag(name = "Purchases", description = "Xaridlar API")
public class PurchaseController {

    private final PurchaseService purchaseService;

    @GetMapping
    @Operation(summary = "Get all purchases", description = "Barcha xaridlarni olish (filtr bilan)")
    public ResponseEntity<ApiResponse<PagedResponse<PurchaseOrderResponse>>> getAllPurchases(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<PurchaseOrderResponse> purchases = purchaseService.getAllPurchases(
                supplierId, status, startDate, endDate, pageable);

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(purchases)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get purchase by ID", description = "ID bo'yicha xaridni olish")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> getPurchaseById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getPurchaseById(id)));
    }

    @GetMapping("/by-supplier/{supplierId}")
    @Operation(summary = "Get purchases by supplier", description = "Ta'minotchi bo'yicha xaridlar")
    public ResponseEntity<ApiResponse<List<PurchaseOrderResponse>>> getPurchasesBySupplier(
            @PathVariable Long supplierId) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getPurchasesBySupplier(supplierId)));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get purchase stats", description = "Xaridlar statistikasi")
    public ResponseEntity<ApiResponse<PurchaseStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getStats()));
    }

    @PostMapping
    @Operation(summary = "Create purchase", description = "Yangi xarid yaratish va omborga kirim")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> createPurchase(
            @Valid @RequestBody PurchaseRequest request) {
        PurchaseOrderResponse purchase = purchaseService.createPurchase(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Xarid yaratildi va omborga kirim qilindi", purchase));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update purchase", description = "Xaridni yangilash (faqat DRAFT)")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> updatePurchase(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseRequest request) {
        PurchaseOrderResponse purchase = purchaseService.updatePurchase(id, request);
        return ResponseEntity.ok(ApiResponse.success("Xarid yangilandi", purchase));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete purchase", description = "Xaridni o'chirish (faqat DRAFT)")
    public ResponseEntity<ApiResponse<Void>> deletePurchase(@PathVariable Long id) {
        purchaseService.deletePurchase(id);
        return ResponseEntity.ok(ApiResponse.success("Xarid o'chirildi"));
    }
}
