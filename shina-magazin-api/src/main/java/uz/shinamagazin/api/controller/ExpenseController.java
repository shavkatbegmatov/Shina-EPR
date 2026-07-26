package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.ExpenseRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.ExpenseResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.ExpenseService;

import java.time.LocalDate;

/**
 * Do'kon xarajatlari.
 *
 * <p>Kassir (SELLER) xarajat KIRITA oladi, lekin tahrirlay/o'chira olmaydi —
 * aks holda kassadan olingan pulni keyin qayta yozib kamomadni yashira olardi.
 */
@RestController
@RequestMapping("/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Xarajatlar")
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @Operation(summary = "List expenses", description = "Xarajatlar ro'yxati (sana oralig'i va turkum bo'yicha)")
    @RequiresPermission(PermissionCode.EXPENSES_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<ExpenseResponse>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) ExpenseCategory category,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(
                expenseService.search(startDate, endDate, category, pageable))));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get expense", description = "Xarajat ma'lumoti")
    @RequiresPermission(PermissionCode.EXPENSES_VIEW)
    public ResponseEntity<ApiResponse<ExpenseResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(expenseService.getById(id)));
    }

    @PostMapping
    @Operation(summary = "Create expense", description = "Xarajat qo'shish")
    @RequiresPermission(PermissionCode.EXPENSES_CREATE)
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Xarajat qo'shildi",
                expenseService.create(userDetails.getId(), request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update expense", description = "Xarajatni tahrirlash")
    @RequiresPermission(PermissionCode.EXPENSES_UPDATE)
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xarajat yangilandi",
                expenseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete expense", description = "Xarajatni o'chirish")
    @RequiresPermission(PermissionCode.EXPENSES_DELETE)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        expenseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Xarajat o'chirildi", null));
    }
}
