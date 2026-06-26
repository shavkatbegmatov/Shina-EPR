package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ShopOrderResponse;
import uz.shinamagazin.api.security.CustomerUserDetails;
import uz.shinamagazin.api.service.ShopOrderService;

/**
 * Mijoz akkaunti — storefront buyurtmalari (login qilgan mijoz uchun).
 * SecurityConfig: `/v1/account/**` hasRole CUSTOMER. Portal (`/v1/portal`) ERP `Sale`'ga
 * asoslangan; bu esa storefront `ShopOrder`'lari (B2C). Portal bilan bir customer auth (telefon+PIN).
 */
@RestController
@RequestMapping("/v1/account/orders")
@RequiredArgsConstructor
@Tag(name = "Account Orders", description = "Mijoz storefront buyurtmalari API")
public class AccountOrderController {

    private final ShopOrderService shopOrderService;

    @GetMapping
    @Operation(summary = "My shop orders",
            description = "Mijozning storefront buyurtmalari (customerId yoki telefon bo'yicha)")
    public ResponseEntity<ApiResponse<PagedResponse<ShopOrderResponse>>> myOrders(
            @AuthenticationPrincipal CustomerUserDetails customer,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(
                shopOrderService.getCustomerOrders(customer.getId(), customer.getPhone(), pageable))));
    }
}
