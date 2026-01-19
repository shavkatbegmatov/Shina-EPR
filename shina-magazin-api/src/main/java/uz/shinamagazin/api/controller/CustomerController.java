package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.CustomerRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CustomerResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.CustomerService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Mijozlar API")
public class CustomerController {

    private final CustomerService customerService;
    private final GenericExportService genericExportService;

    @GetMapping
    @RequiresPermission(PermissionCode.CUSTOMERS_VIEW)
    @Operation(summary = "Get all customers", description = "Barcha mijozlarni olish")
    public ResponseEntity<ApiResponse<PagedResponse<CustomerResponse>>> getAllCustomers(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<CustomerResponse> customers;
        if (search != null && !search.isEmpty()) {
            customers = customerService.searchCustomers(search, pageable);
        } else {
            customers = customerService.getAllCustomers(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(customers)));
    }

    @GetMapping("/{id}")
    @RequiresPermission(PermissionCode.CUSTOMERS_VIEW)
    @Operation(summary = "Get customer by ID", description = "ID bo'yicha mijozni olish")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerById(id)));
    }

    @GetMapping("/phone/{phone}")
    @RequiresPermission(PermissionCode.CUSTOMERS_VIEW)
    @Operation(summary = "Get customer by phone", description = "Telefon bo'yicha mijozni olish")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerByPhone(phone)));
    }

    @GetMapping("/with-debt")
    @RequiresPermission(PermissionCode.CUSTOMERS_VIEW)
    @Operation(summary = "Get customers with debt", description = "Qarzli mijozlar")
    public ResponseEntity<ApiResponse<List<CustomerResponse>>> getCustomersWithDebt() {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomersWithDebt()));
    }

    @PostMapping
    @RequiresPermission(PermissionCode.CUSTOMERS_CREATE)
    @Operation(summary = "Create customer", description = "Yangi mijoz yaratish")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse customer = customerService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Mijoz yaratildi", customer));
    }

    @PutMapping("/{id}")
    @RequiresPermission(PermissionCode.CUSTOMERS_UPDATE)
    @Operation(summary = "Update customer", description = "Mijozni yangilash")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse customer = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(ApiResponse.success("Mijoz yangilandi", customer));
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(PermissionCode.CUSTOMERS_DELETE)
    @Operation(summary = "Delete customer", description = "Mijozni o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Mijoz o'chirildi"));
    }

    @GetMapping("/export")
    @Operation(summary = "Export customers", description = "Mijozlarni eksport qilish")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    public ResponseEntity<Resource> exportCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords
    ) {
        try {
            Pageable pageable = PageRequest.of(0, maxRecords);
            Page<CustomerResponse> page = search != null && !search.isEmpty()
                    ? customerService.searchCustomers(search, pageable)
                    : customerService.getAllCustomers(pageable);

            ByteArrayOutputStream output = genericExportService.export(
                    page.getContent(),
                    CustomerResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Mijozlar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "customers_" + LocalDate.now() + "." + extension;

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
}
