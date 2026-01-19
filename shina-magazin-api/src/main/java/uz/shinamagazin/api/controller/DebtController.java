package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.request.DebtPaymentRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.DebtResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.PaymentResponse;
import uz.shinamagazin.api.enums.DebtStatus;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.DebtService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/debts")
@RequiredArgsConstructor
@Tag(name = "Debts", description = "Qarzlar API")
public class DebtController {

    private final DebtService debtService;
    private final GenericExportService<DebtResponse> genericExportService;

    @GetMapping
    @Operation(summary = "Get all debts", description = "Barcha qarzlarni olish")
    public ResponseEntity<ApiResponse<PagedResponse<DebtResponse>>> getAllDebts(
            @RequestParam(required = false) DebtStatus status,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<DebtResponse> debts = debtService.getAllDebts(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(debts)));
    }

    @GetMapping("/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export debts", description = "Qarzlarni eksport qilish")
    public ResponseEntity<Resource> exportDebts(
            @RequestParam(required = false) DebtStatus status,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords) {
        try {
            Pageable pageable = Pageable.ofSize(maxRecords);
            Page<DebtResponse> page = debtService.getAllDebts(status, pageable);

            ByteArrayOutputStream output = genericExportService.export(
                    page.getContent(),
                    DebtResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Qarzlar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "debts_" + LocalDate.now() + "." + extension;

            ByteArrayResource resource = new ByteArrayResource(output.toByteArray());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(resource.contentLength())
                    .body(resource);

        } catch (Exception e) {
            throw new RuntimeException("Eksport qilishda xatolik: " + e.getMessage(), e);
        }
    }

    @GetMapping("/active")
    @Operation(summary = "Get active debts", description = "Faol qarzlarni olish")
    public ResponseEntity<ApiResponse<List<DebtResponse>>> getActiveDebts() {
        return ResponseEntity.ok(ApiResponse.success(debtService.getActiveDebts()));
    }

    @GetMapping("/overdue")
    @Operation(summary = "Get overdue debts", description = "Muddati o'tgan qarzlarni olish")
    public ResponseEntity<ApiResponse<List<DebtResponse>>> getOverdueDebts() {
        return ResponseEntity.ok(ApiResponse.success(debtService.getOverdueDebts()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get debt by ID", description = "ID bo'yicha qarzni olish")
    public ResponseEntity<ApiResponse<DebtResponse>> getDebtById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getDebtById(id)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer debts", description = "Mijozning qarzlarini olish")
    public ResponseEntity<ApiResponse<List<DebtResponse>>> getCustomerDebts(
            @PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getCustomerDebts(customerId)));
    }

    @GetMapping("/{id}/payments")
    @Operation(summary = "Get debt payments", description = "Qarz to'lovlarini olish")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getDebtPayments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getDebtPayments(id)));
    }

    @GetMapping("/customer/{customerId}/payments")
    @Operation(summary = "Get customer payments", description = "Mijoz to'lovlarini olish")
    public ResponseEntity<ApiResponse<PagedResponse<PaymentResponse>>> getCustomerPayments(
            @PathVariable Long customerId,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<PaymentResponse> payments = debtService.getCustomerPayments(customerId, pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(payments)));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "Make partial payment", description = "Qisman to'lov qilish")
    public ResponseEntity<ApiResponse<DebtResponse>> makePayment(
            @PathVariable Long id,
            @Valid @RequestBody DebtPaymentRequest request) {

        DebtResponse debt = debtService.makePayment(id, request);
        return ResponseEntity.ok(ApiResponse.success("To'lov qabul qilindi", debt));
    }

    @PostMapping("/{id}/pay-full")
    @Operation(summary = "Make full payment", description = "To'liq to'lov qilish")
    public ResponseEntity<ApiResponse<DebtResponse>> makeFullPayment(
            @PathVariable Long id,
            @Valid @RequestBody DebtPaymentRequest request) {

        DebtResponse debt = debtService.makeFullPayment(id, request);
        return ResponseEntity.ok(ApiResponse.success("Qarz to'liq to'landi", debt));
    }

    @GetMapping("/total")
    @Operation(summary = "Get total active debt", description = "Jami faol qarz summasini olish")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalActiveDebt() {
        return ResponseEntity.ok(ApiResponse.success(debtService.getTotalActiveDebt()));
    }

    @GetMapping("/customer/{customerId}/total")
    @Operation(summary = "Get customer total debt", description = "Mijozning jami qarzini olish")
    public ResponseEntity<ApiResponse<BigDecimal>> getCustomerTotalDebt(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.success(debtService.getCustomerTotalDebt(customerId)));
    }
}
