package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.StockAdjustmentRequest;
import uz.shinamagazin.api.dto.response.StockMovementResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.StockMovementRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public Page<StockMovementResponse> getAllMovements(Pageable pageable) {
        return stockMovementRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(StockMovementResponse::from);
    }

    public Page<StockMovementResponse> getMovementsWithFilters(
            Long productId, MovementType movementType, String referenceType, Pageable pageable) {
        return stockMovementRepository.findWithFilters(productId, movementType, referenceType, pageable)
                .map(StockMovementResponse::from);
    }

    public Page<StockMovementResponse> getProductMovements(Long productId, Pageable pageable) {
        return stockMovementRepository.findByProductId(productId, pageable)
                .map(StockMovementResponse::from);
    }

    public StockMovementResponse getMovementById(Long id) {
        StockMovement movement = stockMovementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Harakat", "id", id));
        return StockMovementResponse.from(movement);
    }

    @Transactional
    public StockMovementResponse createStockAdjustment(StockAdjustmentRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", request.getProductId()));

        User currentUser = getCurrentUser();
        int previousStock = product.getQuantity();
        int quantity = request.getQuantity();
        int newStock;

        // Calculate new stock based on movement type
        switch (request.getMovementType()) {
            case IN:
                newStock = previousStock + quantity;
                break;
            case OUT:
                if (quantity > previousStock) {
                    throw new BadRequestException(
                            String.format("Chiqim miqdori (%d) mavjud zaxiradan (%d) ko'p bo'lishi mumkin emas",
                                    quantity, previousStock));
                }
                newStock = previousStock - quantity;
                quantity = -quantity; // Store as negative for OUT movements
                break;
            case ADJUSTMENT:
                // For adjustment, quantity is the absolute new value
                newStock = quantity;
                quantity = newStock - previousStock; // Calculate difference
                break;
            default:
                throw new BadRequestException("Noto'g'ri harakat turi");
        }

        // Update product stock
        product.setQuantity(newStock);
        productRepository.save(product);

        // Create movement record
        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(request.getMovementType())
                .quantity(quantity)
                .previousStock(previousStock)
                .newStock(newStock)
                .referenceType(request.getReferenceType() != null ? request.getReferenceType() : "MANUAL")
                .notes(request.getNotes())
                .createdBy(currentUser)
                .build();

        return StockMovementResponse.from(stockMovementRepository.save(movement));
    }

    public Map<String, Object> getWarehouseStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        Map<String, Object> stats = new HashMap<>();

        // Total products and stock
        long totalProducts = productRepository.countActiveProducts();
        Long totalStock = productRepository.getTotalStock();

        // Low stock count
        long lowStockCount = productRepository.findLowStockProducts().size();

        // Today's movements
        Integer todayIncoming = stockMovementRepository.getTotalIncomingToday(startOfDay);
        Integer todayOutgoing = stockMovementRepository.getTotalOutgoingToday(startOfDay);

        long todayInMovements = stockMovementRepository.countByMovementTypeAndDateAfter(MovementType.IN, startOfDay);
        long todayOutMovements = stockMovementRepository.countByMovementTypeAndDateAfter(MovementType.OUT, startOfDay);

        stats.put("totalProducts", totalProducts);
        stats.put("totalStock", totalStock != null ? totalStock : 0);
        stats.put("lowStockCount", lowStockCount);
        stats.put("todayIncoming", todayIncoming != null ? todayIncoming : 0);
        stats.put("todayOutgoing", todayOutgoing != null ? todayOutgoing : 0);
        stats.put("todayInMovements", todayInMovements);
        stats.put("todayOutMovements", todayOutMovements);

        return stats;
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }
}
