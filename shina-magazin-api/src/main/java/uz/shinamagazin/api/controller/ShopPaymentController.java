package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PaymentInitResponse;
import uz.shinamagazin.api.service.ShopPaymentService;

/**
 * Storefront to'lovni boshlash (guest). Mijoz buyurtma yaratgach shu endpointni
 * chaqiradi; onlayn usul uchun checkout URL qaytadi (frontend yo'naltiradi),
 * naqd uchun null. SecurityConfig'da permitAll.
 */
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
@Tag(name = "Shop Payment", description = "Storefront to'lov (guest)")
public class ShopPaymentController {

    private final ShopPaymentService paymentService;

    @PostMapping("/{orderNo}/pay")
    @Operation(summary = "Initiate payment", description = "To'lovni boshlash — checkout URL (onlayn) yoki naqd")
    public ResponseEntity<ApiResponse<PaymentInitResponse>> pay(@PathVariable String orderNo) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.initiate(orderNo)));
    }
}
