package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CategoryResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.CategoryService;
import uz.shinamagazin.api.service.export.GenericExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Kategoriyalar API")
public class CategoryController {

    private final CategoryService categoryService;
    private final GenericExportService genericExportService;

    @GetMapping
    @Operation(summary = "Get all categories", description = "Barcha kategoriyalarni olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories()));
    }

    @GetMapping("/export")
    @RequiresPermission(PermissionCode.REPORTS_EXPORT)
    @Operation(summary = "Export categories", description = "Kategoriyalarni eksport qilish")
    public ResponseEntity<Resource> exportCategories(
            @RequestParam(defaultValue = "excel") String format) {
        try {
            List<CategoryResponse> categories = categoryService.getAllCategories();

            ByteArrayOutputStream output = genericExportService.export(
                    categories,
                    CategoryResponse.class,
                    GenericExportService.ExportFormat.valueOf(format.toUpperCase()),
                    "Kategoriyalar Hisoboti"
            );

            String extension = format.equalsIgnoreCase("excel") ? "xlsx" : "pdf";
            String contentType = format.equalsIgnoreCase("excel")
                    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : "application/pdf";
            String filename = "categories_" + LocalDate.now() + "." + extension;

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

    @GetMapping("/tree")
    @Operation(summary = "Get category tree", description = "Kategoriyalar daraxtini olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategoryTree() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getCategoryTree()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get category by ID", description = "ID bo'yicha kategoriyani olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getCategoryById(id)));
    }

    @PostMapping
    @Operation(summary = "Create category", description = "Yangi kategoriya yaratish")
    @RequiresPermission(PermissionCode.PRODUCTS_CREATE)
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long parentId) {
        CategoryResponse category = categoryService.createCategory(name, description, parentId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Kategoriya yaratildi", category));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update category", description = "Kategoriyani yangilash")
    @RequiresPermission(PermissionCode.PRODUCTS_UPDATE)
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) Long parentId) {
        CategoryResponse category = categoryService.updateCategory(id, name, description, parentId);
        return ResponseEntity.ok(ApiResponse.success("Kategoriya yangilandi", category));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete category", description = "Kategoriyani o'chirish")
    @RequiresPermission(PermissionCode.PRODUCTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Kategoriya o'chirildi"));
    }
}
