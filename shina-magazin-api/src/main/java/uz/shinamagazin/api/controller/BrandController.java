package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.BrandResponse;
import uz.shinamagazin.api.service.BrandService;

import java.util.List;

@RestController
@RequestMapping("/v1/brands")
@RequiredArgsConstructor
@Tag(name = "Brands", description = "Brendlar API")
public class BrandController {

    private final BrandService brandService;

    @GetMapping
    @Operation(summary = "Get all brands", description = "Barcha brendlarni olish")
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getAllBrands() {
        return ResponseEntity.ok(ApiResponse.success(brandService.getAllBrands()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get brand by ID", description = "ID bo'yicha brendni olish")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(brandService.getBrandById(id)));
    }

    @PostMapping
    @Operation(summary = "Create brand", description = "Yangi brend yaratish")
    public ResponseEntity<ApiResponse<BrandResponse>> createBrand(
            @RequestParam String name,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String logoUrl) {
        BrandResponse brand = brandService.createBrand(name, country, logoUrl);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Brend yaratildi", brand));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update brand", description = "Brendni yangilash")
    public ResponseEntity<ApiResponse<BrandResponse>> updateBrand(
            @PathVariable Long id,
            @RequestParam String name,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String logoUrl) {
        BrandResponse brand = brandService.updateBrand(id, name, country, logoUrl);
        return ResponseEntity.ok(ApiResponse.success("Brend yangilandi", brand));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete brand", description = "Brendni o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable Long id) {
        brandService.deleteBrand(id);
        return ResponseEntity.ok(ApiResponse.success("Brend o'chirildi"));
    }
}
