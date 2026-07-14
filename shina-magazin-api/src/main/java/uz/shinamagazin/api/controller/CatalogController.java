package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.CatalogFacetsResponse;
import uz.shinamagazin.api.dto.response.CatalogProductResponse;
import uz.shinamagazin.api.dto.response.PagedResponse;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.service.CatalogService;

import java.math.BigDecimal;

/**
 * Ommaviy storefront katalogi (`/magazin`) uchun. Auth talab qilmaydi —
 * SecurityConfig'da GET /v1/catalog/** permitAll. Faqat o'qish; tannarx
 * (purchasePrice) chiqarib tashlangan (CatalogProductResponse).
 */
@RestController
@RequestMapping("/v1/catalog")
@RequiredArgsConstructor
@Tag(name = "Catalog", description = "Ommaviy katalog API (storefront)")
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping
    @Operation(summary = "Public catalog", description = "Ommaviy katalog — faol mahsulotlar (filtrlar bilan). " +
            "attrs formati: attributeId:optionId,optionId;attributeId:optionId")
    public ResponseEntity<ApiResponse<PagedResponse<CatalogProductResponse>>> getCatalog(
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Season season,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) String attrs,
            @PageableDefault(size = 24) Pageable pageable) {

        Page<CatalogProductResponse> page = catalogService.getCatalog(
                brandId, categoryId, season, search, priceMin, priceMax, inStock,
                CatalogService.parseAttributeFilters(attrs), pageable);
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.from(page)));
    }

    @GetMapping("/facets")
    @Operation(summary = "Catalog facets", description = "Filtr paneli uchun facetlar: kategoriya daraxti, " +
            "narx diapazoni va tanlangan kategoriyaning atribut filtrlari (variant hisoblagichlari bilan)")
    public ResponseEntity<ApiResponse<CatalogFacetsResponse>> getFacets(
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(ApiResponse.success(catalogService.getFacets(categoryId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Public catalog product", description = "Ommaviy katalog — bitta mahsulot (faqat faol)")
    public ResponseEntity<ApiResponse<CatalogProductResponse>> getCatalogProduct(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(catalogService.getCatalogProduct(id)));
    }
}
