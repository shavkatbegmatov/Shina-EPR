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
import uz.shinamagazin.api.dto.request.ProductRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.dto.response.ProductResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.ProductService;

import java.util.List;

@RestController
@RequestMapping("/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Mahsulotlar API")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Get all products", description = "Barcha mahsulotlarni olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<PagedResponse<ProductResponse>>> getAllProducts(
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Season season,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {

        // Always use filtered query - it handles null values correctly
        Page<ProductResponse> products = productService.getProductsWithFilters(
                brandId, categoryId, season, search, pageable);

        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(products)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID", description = "ID bo'yicha mahsulotni olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProductById(id)));
    }

    @GetMapping("/sku/{sku}")
    @Operation(summary = "Get product by SKU", description = "SKU bo'yicha mahsulotni olish")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySku(@PathVariable String sku) {
        return ResponseEntity.ok(ApiResponse.success(productService.getProductBySku(sku)));
    }

    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock products", description = "Kam zaxiradagi mahsulotlar")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getLowStockProducts() {
        return ResponseEntity.ok(ApiResponse.success(productService.getLowStockProducts()));
    }

    @PostMapping
    @Operation(summary = "Create product", description = "Yangi mahsulot yaratish")
    @RequiresPermission(PermissionCode.PRODUCTS_CREATE)
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductRequest request) {
        ProductResponse product = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Mahsulot yaratildi", product));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update product", description = "Mahsulotni yangilash")
    @RequiresPermission(PermissionCode.PRODUCTS_UPDATE)
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        ProductResponse product = productService.updateProduct(id, request);
        return ResponseEntity.ok(ApiResponse.success("Mahsulot yangilandi", product));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete product", description = "Mahsulotni o'chirish")
    @RequiresPermission(PermissionCode.PRODUCTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Mahsulot o'chirildi"));
    }

    @PatchMapping("/{id}/stock")
    @Operation(summary = "Adjust stock", description = "Zaxirani sozlash")
    @RequiresPermission(PermissionCode.PRODUCTS_UPDATE)
    public ResponseEntity<ApiResponse<ProductResponse>> adjustStock(
            @PathVariable Long id,
            @RequestParam int adjustment) {
        ProductResponse product = productService.adjustStock(id, adjustment);
        return ResponseEntity.ok(ApiResponse.success("Zaxira yangilandi", product));
    }
}
