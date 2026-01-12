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
import uz.shinamagazin.api.dto.request.PaymentRequest;
import uz.shinamagazin.api.dto.request.PurchaseRequest;
import uz.shinamagazin.api.dto.request.ReturnRequest;
import uz.shinamagazin.api.dto.response.*;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;
import uz.shinamagazin.api.service.PurchaseService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/purchases")
@RequiredArgsConstructor
@Tag(name = "Purchases", description = "Xaridlar API")
public class PurchaseController {

    private final PurchaseService purchaseService;

    // ==================== PURCHASE ORDERS ====================

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

    // ==================== PAYMENTS ====================

    @GetMapping("/{id}/payments")
    @Operation(summary = "Get payments", description = "Xarid uchun to'lovlar ro'yxati")
    public ResponseEntity<ApiResponse<List<PurchasePaymentResponse>>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getPayments(id)));
    }

    @PostMapping("/{id}/payments")
    @Operation(summary = "Add payment", description = "Xarid uchun to'lov qo'shish")
    public ResponseEntity<ApiResponse<PurchasePaymentResponse>> addPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequest request) {
        PurchasePaymentResponse payment = purchaseService.addPayment(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("To'lov qo'shildi", payment));
    }

    // ==================== RETURNS ====================

    @GetMapping("/{id}/returns")
    @Operation(summary = "Get returns", description = "Xarid uchun qaytarishlar ro'yxati")
    public ResponseEntity<ApiResponse<List<PurchaseReturnResponse>>> getReturns(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getReturns(id)));
    }

    @PostMapping("/{id}/returns")
    @Operation(summary = "Create return", description = "Xarid uchun qaytarish yaratish")
    public ResponseEntity<ApiResponse<PurchaseReturnResponse>> createReturn(
            @PathVariable Long id,
            @Valid @RequestBody ReturnRequest request) {
        PurchaseReturnResponse returnResponse = purchaseService.createReturn(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Qaytarish yaratildi", returnResponse));
    }
}
