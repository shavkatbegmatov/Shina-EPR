package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.AttributeRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.AttributeResponse;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.security.RequiresPermission;
import uz.shinamagazin.api.service.AttributeService;

import java.util.List;

/**
 * Mahsulot xususiyatlari (atributlar) boshqaruvi. Katalog sohasiga kirgani
 * uchun PRODUCTS_* ruxsatlari bilan himoyalanadi.
 */
@RestController
@RequestMapping("/v1/attributes")
@RequiredArgsConstructor
@Tag(name = "Attributes", description = "Mahsulot xususiyatlari (atributlar) API")
public class AttributeController {

    private final AttributeService attributeService;

    @GetMapping
    @Operation(summary = "Get all attributes", description = "Barcha faol atributlar (variantlari bilan)")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<List<AttributeResponse>>> getAllAttributes() {
        return ResponseEntity.ok(ApiResponse.success(attributeService.getAllAttributes()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get attribute", description = "ID bo'yicha atribut")
    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public ResponseEntity<ApiResponse<AttributeResponse>> getAttributeById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(attributeService.getAttributeById(id)));
    }

    @PostMapping
    @Operation(summary = "Create attribute", description = "Yangi atribut yaratish")
    @RequiresPermission(PermissionCode.PRODUCTS_CREATE)
    public ResponseEntity<ApiResponse<AttributeResponse>> createAttribute(
            @Valid @RequestBody AttributeRequest request) {
        AttributeResponse attribute = attributeService.createAttribute(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Atribut yaratildi", attribute));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update attribute", description = "Atributni yangilash")
    @RequiresPermission(PermissionCode.PRODUCTS_UPDATE)
    public ResponseEntity<ApiResponse<AttributeResponse>> updateAttribute(
            @PathVariable Long id,
            @Valid @RequestBody AttributeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Atribut yangilandi",
                attributeService.updateAttribute(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete attribute", description = "Atributni o'chirish (soft)")
    @RequiresPermission(PermissionCode.PRODUCTS_DELETE)
    public ResponseEntity<ApiResponse<Void>> deleteAttribute(@PathVariable Long id) {
        attributeService.deleteAttribute(id);
        return ResponseEntity.ok(ApiResponse.success("Atribut o'chirildi"));
    }
}
