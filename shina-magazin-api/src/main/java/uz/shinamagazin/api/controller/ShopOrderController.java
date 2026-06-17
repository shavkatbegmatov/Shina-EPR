package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.request.CreateShopOrderRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ShopOrderResponse;
import uz.shinamagazin.api.dto.response.ShopOrderStatusResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.security.SimpleRateLimiter;
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
    private final SimpleRateLimiter rateLimiter;

    @PostMapping
    @Operation(summary = "Create order", description = "Storefront buyurtma yaratish (narx serverda hisoblanadi)")
    public ResponseEntity<ApiResponse<ShopOrderResponse>> createOrder(
            @Valid @RequestBody CreateShopOrderRequest request,
            HttpServletRequest httpRequest) {
        if (!rateLimiter.allow("order:" + clientIp(httpRequest))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring.");
        }
        ShopOrderResponse order = shopOrderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Buyurtma qabul qilindi", order));
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    @GetMapping("/{orderNo}/status")
    @Operation(summary = "Get order status (public)",
            description = "Buyurtma holati — ommaviy, shaxsiy ma'lumotsiz (tasdiq sahifasi uchun)")
    public ResponseEntity<ApiResponse<ShopOrderStatusResponse>> getOrderStatus(@PathVariable String orderNo) {
        return ResponseEntity.ok(ApiResponse.success(shopOrderService.getStatusByOrderNo(orderNo)));
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
