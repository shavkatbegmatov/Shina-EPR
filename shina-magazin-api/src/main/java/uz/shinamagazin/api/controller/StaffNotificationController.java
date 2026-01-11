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
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.StaffNotificationResponse;
import uz.shinamagazin.api.enums.StaffNotificationType;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.StaffNotificationService;

import java.util.List;

@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Staff Notifications", description = "Xodimlar bildirishnomalari API")
public class StaffNotificationController {

    private final StaffNotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get notifications", description = "Bildirishnomalar ro'yxatini olish")
    public ResponseEntity<ApiResponse<PagedResponse<StaffNotificationResponse>>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) StaffNotificationType type,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {

        Page<StaffNotificationResponse> notifications;
        if (type != null) {
            notifications = notificationService.getNotificationsByType(userDetails.getId(), type, pageable);
        } else {
            notifications = notificationService.getNotifications(userDetails.getId(), pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(notifications)));
    }

    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications", description = "O'qilmagan bildirishnomalar (dropdown uchun)")
    public ResponseEntity<ApiResponse<List<StaffNotificationResponse>>> getUnreadNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        List<StaffNotificationResponse> notifications = notificationService.getUnreadNotifications(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread count", description = "O'qilmagan bildirishnomalar soni")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        long count = notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark as read", description = "Bildirishnomani o'qilgan qilish")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Bildirishnoma o'qilgan deb belgilandi", null));
    }

    @PostMapping("/mark-all-read")
    @Operation(summary = "Mark all as read", description = "Barcha bildirishnomalarni o'qilgan qilish")
    public ResponseEntity<ApiResponse<Integer>> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        int count = notificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.success(count + " ta bildirishnoma o'qilgan qilindi", count));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete notification", description = "Bildirishnomani o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success("Bildirishnoma o'chirildi", null));
    }
}
