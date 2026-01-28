package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.*;
import uz.shinamagazin.api.security.CustomerUserDetails;
import uz.shinamagazin.api.service.CustomerPortalService;
import uz.shinamagazin.api.service.NotificationService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/portal")
@RequiredArgsConstructor
@Tag(name = "Customer Portal", description = "Mijoz shaxsiy kabineti API")
public class CustomerPortalController {

    private final CustomerPortalService portalService;
    private final NotificationService notificationService;

    // ==================== PROFILE ====================

    @GetMapping("/profile")
    @Operation(summary = "Profilni olish", description = "Mijoz profil ma'lumotlari")
    public ResponseEntity<ApiResponse<CustomerPortalProfileResponse>> getProfile(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        CustomerPortalProfileResponse response = portalService.getProfile(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/profile/language")
    @Operation(summary = "Tilni o'zgartirish", description = "Interfeys tilini o'zgartirish (uz/ru)")
    public ResponseEntity<ApiResponse<CustomerPortalProfileResponse>> updateLanguage(
            @AuthenticationPrincipal CustomerUserDetails customerDetails,
            @RequestParam String lang) {
        CustomerPortalProfileResponse response = portalService.updateLanguage(customerDetails.getId(), lang);
        return ResponseEntity.ok(ApiResponse.success("Til o'zgartirildi", response));
    }

    // ==================== DASHBOARD ====================

    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard statistikasi", description = "Umumiy statistika")
    public ResponseEntity<ApiResponse<CustomerPortalService.CustomerDashboardStats>> getDashboard(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        CustomerPortalService.CustomerDashboardStats stats = portalService.getDashboardStats(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    // ==================== PURCHASES ====================

    @GetMapping("/purchases")
    @Operation(summary = "Xaridlar ro'yxati", description = "Mijozning xaridlar tarixi")
    public ResponseEntity<ApiResponse<Page<SaleResponse>>> getPurchases(
            @AuthenticationPrincipal CustomerUserDetails customerDetails,
            @PageableDefault(size = 10, sort = "saleDate") Pageable pageable) {
        Page<SaleResponse> purchases = portalService.getPurchases(customerDetails.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(purchases));
    }

    @GetMapping("/purchases/{id}")
    @Operation(summary = "Xarid tafsilotlari", description = "Bitta xaridning to'liq ma'lumotlari")
    public ResponseEntity<ApiResponse<SaleResponse>> getPurchaseDetails(
            @AuthenticationPrincipal CustomerUserDetails customerDetails,
            @PathVariable Long id) {
        SaleResponse purchase = portalService.getPurchaseDetails(customerDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.success(purchase));
    }

    // ==================== DEBTS ====================

    @GetMapping("/debts")
    @Operation(summary = "Qarzlar ro'yxati", description = "Mijozning qarzlari")
    public ResponseEntity<ApiResponse<List<DebtResponse>>> getDebts(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        List<DebtResponse> debts = portalService.getDebts(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(debts));
    }

    @GetMapping("/debts/total")
    @Operation(summary = "Umumiy qarz summasi", description = "Jami aktiv qarz miqdori")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getTotalDebt(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        BigDecimal total = portalService.getTotalDebt(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("totalDebt", total)));
    }

    // ==================== NOTIFICATIONS ====================

    @GetMapping("/notifications")
    @Operation(summary = "Bildirishnomalar", description = "Mijoz bildirishnomalari")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal CustomerUserDetails customerDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        String lang = customerDetails.getPreferredLanguage();
        Page<NotificationResponse> notifications = notificationService.getCustomerNotifications(
                customerDetails.getId(), lang, pageable);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @GetMapping("/notifications/unread-count")
    @Operation(summary = "O'qilmagan soni", description = "O'qilmagan bildirishnomalar soni")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        long count = notificationService.getUnreadCount(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PostMapping("/notifications/{id}/read")
    @Operation(summary = "O'qilgan deb belgilash", description = "Bildirishnomani o'qilgan qilish")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal CustomerUserDetails customerDetails,
            @PathVariable Long id) {
        notificationService.markAsRead(id, customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success("Bildirishnoma o'qilgan deb belgilandi", null));
    }

    @PostMapping("/notifications/mark-all-read")
    @Operation(summary = "Barchasini o'qilgan qilish", description = "Barcha bildirishnomalarni o'qilgan qilish")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllAsRead(
            @AuthenticationPrincipal CustomerUserDetails customerDetails) {
        int count = notificationService.markAllAsRead(customerDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(
                count + " ta bildirishnoma o'qilgan deb belgilandi",
                Map.of("markedCount", count)));
    }
}
