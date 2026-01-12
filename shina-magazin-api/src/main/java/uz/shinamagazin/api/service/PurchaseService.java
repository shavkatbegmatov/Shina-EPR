package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.PurchaseItemRequest;
import uz.shinamagazin.api.dto.request.PurchaseRequest;
import uz.shinamagazin.api.dto.response.PurchaseItemResponse;
import uz.shinamagazin.api.dto.response.PurchaseOrderResponse;
import uz.shinamagazin.api.dto.response.PurchaseStatsResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final SupplierService supplierService;

    public Page<PurchaseOrderResponse> getAllPurchases(
            Long supplierId, PurchaseOrderStatus status,
            LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return purchaseOrderRepository.findAllWithFilters(supplierId, status, startDate, endDate, pageable)
                .map(this::mapToResponse);
    }

    public PurchaseOrderResponse getPurchaseById(Long id) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));
        return mapToResponseWithItems(purchase);
    }

    public List<PurchaseOrderResponse> getPurchasesBySupplier(Long supplierId) {
        return purchaseOrderRepository.findBySupplierIdOrderByOrderDateDesc(supplierId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchaseOrderResponse createPurchase(PurchaseRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", request.getSupplierId()));

        User currentUser = getCurrentUser();

        // Generate order number
        String orderNumber = generateOrderNumber();

        // Calculate total amount
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PurchaseItemRequest item : request.getItems()) {
            BigDecimal itemTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);
        }

        // Create purchase order
        PurchaseOrder purchase = PurchaseOrder.builder()
                .orderNumber(orderNumber)
                .supplier(supplier)
                .orderDate(request.getOrderDate())
                .totalAmount(totalAmount)
                .paidAmount(request.getPaidAmount())
                .status(PurchaseOrderStatus.RECEIVED) // Darhol qabul qilingan
                .notes(request.getNotes())
                .createdBy(currentUser)
                .build();

        // Create items
        for (PurchaseItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", itemRequest.getProductId()));

            BigDecimal itemTotalPrice = itemRequest.getUnitPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .purchaseOrder(purchase)
                    .product(product)
                    .orderedQuantity(itemRequest.getQuantity())
                    .receivedQuantity(itemRequest.getQuantity()) // Qabul qilingan
                    .unitPrice(itemRequest.getUnitPrice())
                    .totalPrice(itemTotalPrice)
                    .build();

            purchase.addItem(item);

            // Create stock movement for each item
            createStockMovement(product, itemRequest.getQuantity(), purchase.getOrderNumber(), currentUser);

            // Update product stock
            product.setQuantity(product.getQuantity() + itemRequest.getQuantity());
            productRepository.save(product);
        }

        purchase.setReceivedDate(LocalDate.now());
        PurchaseOrder savedPurchase = purchaseOrderRepository.save(purchase);

        // Update supplier balance (add debt)
        BigDecimal debtAmount = totalAmount.subtract(request.getPaidAmount());
        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            supplierService.updateBalance(supplier.getId(), debtAmount);
        }

        return mapToResponseWithItems(savedPurchase);
    }

    @Transactional
    public PurchaseOrderResponse updatePurchase(Long id, PurchaseRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException("Faqat qoralama holatidagi xaridlarni tahrirlash mumkin");
        }

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", request.getSupplierId()));

        // Update purchase order fields
        purchase.setSupplier(supplier);
        purchase.setOrderDate(request.getOrderDate());
        purchase.setPaidAmount(request.getPaidAmount());
        purchase.setNotes(request.getNotes());

        // Clear existing items
        purchase.getItems().clear();

        // Calculate total and add new items
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (PurchaseItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", itemRequest.getProductId()));

            BigDecimal itemTotalPrice = itemRequest.getUnitPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            totalAmount = totalAmount.add(itemTotalPrice);

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .purchaseOrder(purchase)
                    .product(product)
                    .orderedQuantity(itemRequest.getQuantity())
                    .receivedQuantity(0)
                    .unitPrice(itemRequest.getUnitPrice())
                    .totalPrice(itemTotalPrice)
                    .build();

            purchase.addItem(item);
        }

        purchase.setTotalAmount(totalAmount);
        PurchaseOrder savedPurchase = purchaseOrderRepository.save(purchase);

        return mapToResponseWithItems(savedPurchase);
    }

    @Transactional
    public void deletePurchase(Long id) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", id));

        if (purchase.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException("Faqat qoralama holatidagi xaridlarni o'chirish mumkin");
        }

        purchaseOrderRepository.delete(purchase);
    }

    public PurchaseStatsResponse getStats() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStart = currentMonth.atDay(1);
        LocalDate monthEnd = currentMonth.atEndOfMonth();

        Long totalPurchases = purchaseOrderRepository.countAllActive();
        Long todayPurchases = purchaseOrderRepository.countByOrderDate(today);
        Long monthPurchases = purchaseOrderRepository.countByOrderDateBetween(monthStart, monthEnd);
        BigDecimal totalAmount = purchaseOrderRepository.sumTotalAmount();
        BigDecimal totalDebt = purchaseOrderRepository.sumTotalDebt();

        return PurchaseStatsResponse.builder()
                .totalPurchases(totalPurchases != null ? totalPurchases : 0L)
                .todayPurchases(todayPurchases != null ? todayPurchases : 0L)
                .monthPurchases(monthPurchases != null ? monthPurchases : 0L)
                .totalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalDebt(totalDebt != null ? totalDebt : BigDecimal.ZERO)
                .build();
    }

    private void createStockMovement(Product product, int quantity, String referenceNumber, User user) {
        int previousStock = product.getQuantity();
        int newStock = previousStock + quantity;

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(MovementType.IN)
                .quantity(quantity)
                .previousStock(previousStock)
                .newStock(newStock)
                .referenceType("PURCHASE")
                .referenceId(null)
                .notes("Xarid: " + referenceNumber)
                .createdBy(user)
                .build();

        stockMovementRepository.save(movement);
    }

    private String generateOrderNumber() {
        String prefix = "PO-";
        Integer maxNum = purchaseOrderRepository.findMaxOrderNumber(prefix);
        int nextNum = (maxNum != null ? maxNum : 0) + 1;
        return String.format("%s%06d", prefix, nextNum);
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }

    private PurchaseOrderResponse mapToResponse(PurchaseOrder purchase) {
        int itemCount = purchase.getItems().size();
        int totalQuantity = purchase.getItems().stream()
                .mapToInt(PurchaseOrderItem::getOrderedQuantity)
                .sum();

        return PurchaseOrderResponse.builder()
                .id(purchase.getId())
                .orderNumber(purchase.getOrderNumber())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getName())
                .orderDate(purchase.getOrderDate())
                .totalAmount(purchase.getTotalAmount())
                .paidAmount(purchase.getPaidAmount())
                .debtAmount(purchase.getTotalAmount().subtract(purchase.getPaidAmount()))
                .status(purchase.getStatus())
                .notes(purchase.getNotes())
                .itemCount(itemCount)
                .totalQuantity(totalQuantity)
                .createdAt(purchase.getCreatedAt())
                .createdByName(purchase.getCreatedBy().getFullName())
                .build();
    }

    private PurchaseOrderResponse mapToResponseWithItems(PurchaseOrder purchase) {
        PurchaseOrderResponse response = mapToResponse(purchase);

        List<PurchaseItemResponse> items = purchase.getItems().stream()
                .map(item -> PurchaseItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .quantity(item.getOrderedQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        response.setItems(items);
        return response;
    }
}
