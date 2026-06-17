package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.CreateShopOrderRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ShopOrderResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.ShopOrderService;

/**
 * Storefront buyurtmalari (`/magazin`) — guest checkout (auth shart emas).
 * SecurityConfig'da POST /v1/orders va GET /v1/orders/{orderNo} permitAll.
 *
 * ⚠️ Ommaviy yozish endpointi — abuse (spam buyurtma) ga qarshi rate-limiting/
 * captcha keyingi bosqichda qo'shilishi kerak.
 */
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Shop Orders", description = "Storefront buyurtmalari API (guest)")
public class ShopOrderController {

    private final ShopOrderService shopOrderService;

    @PostMapping
    @Operation(summary = "Create order", description = "Storefront buyurtma yaratish (narx serverda hisoblanadi)")
    public ResponseEntity<ApiResponse<ShopOrderResponse>> createOrder(
            @Valid @RequestBody CreateShopOrderRequest request) {
        ShopOrderResponse order = shopOrderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Buyurtma qabul qilindi", order));
    }

    @GetMapping("/{orderNo}")
    @Operation(summary = "Get order", description = "Buyurtma raqami bo'yicha buyurtma")
    @RequiresPermission(PermissionCode.SALES_VIEW)
    public ResponseEntity<ApiResponse<ShopOrderResponse>> getOrder(@PathVariable String orderNo) {
        return ResponseEntity.ok(ApiResponse.success(shopOrderService.getByOrderNo(orderNo)));
    }

    // --- Xodim (himoyalangan; permitAll EMAS) ---

    @GetMapping
    @Operation(summary = "List orders (staff)", description = "Buyurtmalar ro'yxati — xodim uchun")
    @RequiresPermission(PermissionCode.SALES_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<ShopOrderResponse>>> listOrders(
            @RequestParam(required = false) ShopOrderStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PagedResponse.from(shopOrderService.getOrders(status, pageable))));
    }

    @PatchMapping("/{orderNo}/status")
    @Operation(summary = "Update order status (staff)", description = "Buyurtma holatini yangilash")
    @RequiresPermission(PermissionCode.SALES_VIEW)
    public ResponseEntity<ApiResponse<ShopOrderResponse>> updateStatus(
            @PathVariable String orderNo,
            @RequestParam ShopOrderStatus status) {
        return ResponseEntity.ok(ApiResponse.success("Holat yangilandi",
                shopOrderService.updateStatus(orderNo, status)));
    }
}
