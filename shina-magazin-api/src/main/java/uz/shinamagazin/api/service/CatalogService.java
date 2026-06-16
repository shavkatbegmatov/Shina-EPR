package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.CatalogProductResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.enums.Season;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.ProductRepository;

/**
 * Ommaviy storefront katalogi (auth talab qilmaydi). Faqat o'qish.
 * Mavjud ProductRepository'ni qayta ishlatadi — barcha so'rovlar `active = true`
 * mahsulotlarni qaytaradi va tannarx (purchasePrice) chiqarib tashlangan
 * CatalogProductResponse'ga map qilinadi.
 */
@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ProductRepository productRepository;

    public Page<CatalogProductResponse> getCatalog(
            Long brandId, Long categoryId, Season season, String search, Pageable pageable) {
        return productRepository.findWithFilters(brandId, categoryId, season, search, pageable)
                .map(CatalogProductResponse::from);
    }

    public CatalogProductResponse getCatalogProduct(Long id) {
        Product product = productRepository.findById(id)
                .filter(p -> Boolean.TRUE.equals(p.getActive())) // faol bo'lmagan mahsulot ommaga ko'rinmaydi
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", id));
        return CatalogProductResponse.from(product);
    }
}
