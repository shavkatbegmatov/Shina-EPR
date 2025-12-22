package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.CustomerRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CustomerResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.service.CustomerService;

import java.util.List;

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Mijozlar API")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
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
    @Operation(summary = "Get customer by ID", description = "ID bo'yicha mijozni olish")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerById(id)));
    }

    @GetMapping("/phone/{phone}")
    @Operation(summary = "Get customer by phone", description = "Telefon bo'yicha mijozni olish")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerByPhone(phone)));
    }

    @GetMapping("/with-debt")
    @Operation(summary = "Get customers with debt", description = "Qarzli mijozlar")
    public ResponseEntity<ApiResponse<List<CustomerResponse>>> getCustomersWithDebt() {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomersWithDebt()));
    }

    @PostMapping
    @Operation(summary = "Create customer", description = "Yangi mijoz yaratish")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse customer = customerService.createCustomer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Mijoz yaratildi", customer));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update customer", description = "Mijozni yangilash")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        CustomerResponse customer = customerService.updateCustomer(id, request);
        return ResponseEntity.ok(ApiResponse.success("Mijoz yangilandi", customer));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete customer", description = "Mijozni o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Mijoz o'chirildi"));
    }
}
