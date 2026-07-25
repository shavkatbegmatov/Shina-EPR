package uz.shinamagazin.api.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import uz.shinamagazin.api.dto.request.StockAdjustmentRequest;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.StockMovementRepository;
import uz.shinamagazin.api.repository.SupplierRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Zaxira invariantini qulflaydi: `products.quantity` HECH QACHON manfiy bo'lmasin
 * va "chiqim" harakati zaxirani OSHIRMASIN.
 *
 * Tarixiy zaiflik: `StockAdjustmentRequest.quantity` da faqat @NotNull bor edi.
 * `OUT` qorovuli `quantity > previousStock` ko'rinishida edi, shuning uchun
 * quantity=-100 tekshiruvdan o'tib ketardi va `previousStock - (-100)` zaxirani
 * 100 taga OSHIRARDI — "chiqim" hujjati orqali tekin tovar. `ADJUSTMENT` esa
 * zaxirani to'g'ridan-to'g'ri manfiy qiymatga qo'yardi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockMovementServiceTest {

    private static final long USER_ID = 7L;
    private static final long PRODUCT_ID = 42L;

    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private SupplierRepository supplierRepository;

    private StockMovementService service;
    private Product product;

    @BeforeEach
    void setUp() {
        service = new StockMovementService(
                stockMovementRepository, productRepository, userRepository, supplierRepository);

        product = Product.builder().name("Michelin Primacy 4").quantity(10).build();
        when(productRepository.findById(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(new User()));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        authenticateAs(USER_ID);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("OUT: manfiy miqdor zaxirani oshira olmaydi")
    void negativeOutQuantityCannotInflateStock() {
        BadRequestException e = assertThrows(BadRequestException.class,
                () -> service.createStockAdjustment(request(MovementType.OUT, -100)));

        assertEquals(10, product.getQuantity(), "zaxira o'zgarmasligi kerak");
        assertEquals("Chiqim miqdori musbat bo'lishi shart", e.getMessage());
        verify(productRepository, never()).save(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADJUSTMENT: zaxirani manfiy qiymatga qo'yib bo'lmaydi")
    void adjustmentCannotSetNegativeStock() {
        assertThrows(BadRequestException.class,
                () -> service.createStockAdjustment(request(MovementType.ADJUSTMENT, -50)));

        assertEquals(10, product.getQuantity());
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("IN: manfiy miqdor zaxirani kamaytira olmaydi")
    void negativeInQuantityCannotReduceStock() {
        assertThrows(BadRequestException.class,
                () -> service.createStockAdjustment(request(MovementType.IN, -5)));

        assertEquals(10, product.getQuantity());
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("OUT: zaxiradan ko'p chiqim rad etiladi (mavjud qoida saqlanadi)")
    void outCannotExceedAvailableStock() {
        assertThrows(BadRequestException.class,
                () -> service.createStockAdjustment(request(MovementType.OUT, 11)));

        assertEquals(10, product.getQuantity());
    }

    @Test
    @DisplayName("ADJUSTMENT: nolga tushirish to'g'ri amal — rad etilmasligi kerak")
    void adjustmentToZeroIsAllowed() {
        service.createStockAdjustment(request(MovementType.ADJUSTMENT, 0));

        assertEquals(0, product.getQuantity());
        verify(productRepository).save(product);
    }

    @Test
    @DisplayName("Oddiy kirim/chiqim avvalgidek ishlaydi")
    void validMovementsStillWork() {
        service.createStockAdjustment(request(MovementType.IN, 5));
        assertEquals(15, product.getQuantity());

        service.createStockAdjustment(request(MovementType.OUT, 3));
        assertEquals(12, product.getQuantity());
    }

    // --- helpers ---

    private static StockAdjustmentRequest request(MovementType type, int quantity) {
        StockAdjustmentRequest r = new StockAdjustmentRequest();
        r.setProductId(PRODUCT_ID);
        r.setMovementType(type);
        r.setQuantity(quantity);
        return r;
    }

    private void authenticateAs(long userId) {
        CustomUserDetails principal = org.mockito.Mockito.mock(CustomUserDetails.class);
        when(principal.getId()).thenReturn(userId);

        Authentication auth = org.mockito.Mockito.mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);

        SecurityContextHolder.setContext(new SecurityContextImpl(auth));
    }
}
