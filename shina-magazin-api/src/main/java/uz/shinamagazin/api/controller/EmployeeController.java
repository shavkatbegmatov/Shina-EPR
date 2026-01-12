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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.UserResponse;
import uz.shinamagazin.api.enums.EmployeeStatus;
import uz.shinamagazin.api.service.EmployeeService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employees", description = "Xodimlar API")
@PreAuthorize("hasRole('ADMIN')")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    @Operation(summary = "Get all employees", description = "Barcha xodimlarni olish")
    public ResponseEntity<ApiResponse<PagedResponse<EmployeeResponse>>> getAllEmployees(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {

        Page<EmployeeResponse> employees;
        if (search != null && !search.isEmpty()) {
            employees = employeeService.searchEmployees(search, pageable);
        } else {
            employees = employeeService.getAllEmployees(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(employees)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get employee by ID", description = "ID bo'yicha xodimni olish")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getEmployeeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getEmployeeById(id)));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Get employees by status", description = "Status bo'yicha xodimlar")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getEmployeesByStatus(
            @PathVariable EmployeeStatus status) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getEmployeesByStatus(status)));
    }

    @GetMapping("/department/{department}")
    @Operation(summary = "Get employees by department", description = "Bo'lim bo'yicha xodimlar")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getEmployeesByDepartment(
            @PathVariable String department) {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getEmployeesByDepartment(department)));
    }

    @GetMapping("/departments")
    @Operation(summary = "Get all departments", description = "Barcha bo'limlar ro'yxati")
    public ResponseEntity<ApiResponse<List<String>>> getAllDepartments() {
        return ResponseEntity.ok(ApiResponse.success(employeeService.getAllDepartments()));
    }

    @GetMapping("/available-users")
    @Operation(summary = "Get available users", description = "Xodimga bog'lanmagan foydalanuvchilar")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAvailableUsers() {
        List<UserResponse> users = employeeService.getAvailableUsers().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PostMapping
    @Operation(summary = "Create employee", description = "Yangi xodim yaratish")
    public ResponseEntity<ApiResponse<EmployeeResponse>> createEmployee(
            @Valid @RequestBody EmployeeRequest request) {
        EmployeeResponse employee = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Xodim yaratildi", employee));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update employee", description = "Xodimni yangilash")
    public ResponseEntity<ApiResponse<EmployeeResponse>> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request) {
        EmployeeResponse employee = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(ApiResponse.success("Xodim yangilandi", employee));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete employee", description = "Xodimni o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.ok(ApiResponse.success("Xodim o'chirildi"));
    }
}
