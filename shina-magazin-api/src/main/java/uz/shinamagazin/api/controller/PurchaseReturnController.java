package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.PurchaseReturnResponse;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;
import uz.shinamagazin.api.service.PurchaseService;

@RestController
@RequestMapping("/v1/purchase-returns")
@RequiredArgsConstructor
@Tag(name = "Purchase Returns", description = "Xarid qaytarishlari API")
public class PurchaseReturnController {

    private final PurchaseService purchaseService;

    @GetMapping
    @Operation(summary = "Get all returns", description = "Barcha qaytarishlarni olish")
    public ResponseEntity<ApiResponse<PagedResponse<PurchaseReturnResponse>>> getAllReturns(
            @RequestParam(required = false) PurchaseReturnStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<PurchaseReturnResponse> returns = purchaseService.getAllReturns(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(returns)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get return by ID", description = "ID bo'yicha qaytarishni olish")
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> getReturnById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getReturnById(id)));
    }

    @PutMapping("/{id}/approve")
    @Operation(summary = "Approve return", description = "Qaytarishni tasdiqlash")
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> approveReturn(@PathVariable Long id) {
        PurchaseReturnResponse returnResponse = purchaseService.approveReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish tasdiqlandi", returnResponse));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Complete return", description = "Qaytarishni yakunlash (ombor va balans yangilanadi)")
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> completeReturn(@PathVariable Long id) {
        PurchaseReturnResponse returnResponse = purchaseService.completeReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish yakunlandi", returnResponse));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete return", description = "Qaytarishni o'chirish (faqat PENDING)")
    public ResponseEntity<ApiResponse<Void>> deleteReturn(@PathVariable Long id) {
        purchaseService.deleteReturn(id);
        return ResponseEntity.ok(ApiResponse.success("Qaytarish o'chirildi"));
    }
}
