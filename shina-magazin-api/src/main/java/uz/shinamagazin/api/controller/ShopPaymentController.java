package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PaymentInitResponse;
import uz.shinamagazin.api.security.ClientIp;
import uz.shinamagazin.api.security.SimpleRateLimiter;
import uz.shinamagazin.api.service.ShopPaymentService;

/**
 * Storefront to'lovni boshlash (guest). Mijoz buyurtma yaratgach shu endpointni
 * chaqiradi; onlayn usul uchun checkout URL qaytadi (frontend yo'naltiradi),
 * naqd uchun null. SecurityConfig'da permitAll.
 *
 * <p>Ommaviy va holatni o'zgartiruvchi (PENDING → PROCESSING) endpoint, shuning uchun
 * IP bo'yicha chegaralangan. Buyurtma raqamlari tasodifiy (2^40) — taxminlab
 * bo'lmaydi, chegara esa ketma-ket sinab ko'rishni ma'nosiz qiladi.
 */
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Shop Payment", description = "Storefront to'lov (guest)")
public class ShopPaymentController {

    private static final int PAY_MAX_PER_MINUTE = 10;

    private final ShopPaymentService paymentService;
    private final SimpleRateLimiter rateLimiter;

    @PostMapping("/{orderNo}/pay")
    @Operation(summary = "Initiate payment", description = "To'lovni boshlash — checkout URL (onlayn) yoki naqd")
    public ResponseEntity<ApiResponse<PaymentInitResponse>> pay(
            @PathVariable String orderNo, HttpServletRequest httpRequest) {
        if (!rateLimiter.allow("order-pay:" + ClientIp.of(httpRequest), PAY_MAX_PER_MINUTE, 60_000)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring.");
        }
        return ResponseEntity.ok(ApiResponse.success(paymentService.initiate(orderNo)));
    }
}
