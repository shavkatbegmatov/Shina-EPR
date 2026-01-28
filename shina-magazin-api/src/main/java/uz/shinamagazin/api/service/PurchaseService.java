package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.*;
import uz.shinamagazin.api.dto.response.*;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;
import uz.shinamagazin.api.enums.PurchaseReturnStatus;
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
    private final PurchasePaymentRepository purchasePaymentRepository;
    private final PurchaseReturnRepository purchaseReturnRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final SupplierService supplierService;

    // ==================== PURCHASE ORDERS ====================

    public Page<PurchaseOrderResponse> getAllPurchases(
            Long supplierId, PurchaseOrderStatus status,
            LocalDate startDate, LocalDate endDate, Pageable pageable) {
        // Native query uchun enum ni String ga o'giramiz
        String statusStr = status != null ? status.name() : null;
        return purchaseOrderRepository.findAllWithFilters(supplierId, statusStr, startDate, endDate, pageable)
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

        // Determine payment status
        PaymentStatus paymentStatus = calculatePaymentStatus(request.getPaidAmount(), totalAmount);

        // Create purchase order
        PurchaseOrder purchase = PurchaseOrder.builder()
                .orderNumber(orderNumber)
                .supplier(supplier)
                .orderDate(request.getOrderDate())
                .totalAmount(totalAmount)
                .paidAmount(request.getPaidAmount())
                .status(PurchaseOrderStatus.RECEIVED)
                .paymentStatus(paymentStatus)
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
                    .receivedQuantity(itemRequest.getQuantity())
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

        purchase.setSupplier(supplier);
        purchase.setOrderDate(request.getOrderDate());
        purchase.setPaidAmount(request.getPaidAmount());
        purchase.setNotes(request.getNotes());

        purchase.getItems().clear();

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
        purchase.updatePaymentStatus();
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
        Long pendingReturns = purchaseReturnRepository.countByStatus(PurchaseReturnStatus.PENDING);

        return PurchaseStatsResponse.builder()
                .totalPurchases(totalPurchases != null ? totalPurchases : 0L)
                .todayPurchases(todayPurchases != null ? todayPurchases : 0L)
                .monthPurchases(monthPurchases != null ? monthPurchases : 0L)
                .totalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalDebt(totalDebt != null ? totalDebt : BigDecimal.ZERO)
                .pendingReturns(pendingReturns != null ? pendingReturns : 0L)
                .build();
    }

    // ==================== PAYMENTS ====================

    public List<PurchasePaymentResponse> getPayments(Long purchaseId) {
        purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        return purchasePaymentRepository.findByPurchaseOrderIdOrderByPaymentDateDesc(purchaseId)
                .stream()
                .map(this::mapToPaymentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchasePaymentResponse addPayment(Long purchaseId, PaymentRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        User currentUser = getCurrentUser();

        // Validate payment amount
        BigDecimal remainingDebt = purchase.getTotalAmount().subtract(purchase.getPaidAmount());
        if (request.getAmount().compareTo(remainingDebt) > 0) {
            throw new BadRequestException("To'lov summasi qolgan qarzdan (" + remainingDebt + ") katta bo'lishi mumkin emas");
        }

        // Create payment
        PurchasePayment payment = PurchasePayment.builder()
                .purchaseOrder(purchase)
                .amount(request.getAmount())
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .referenceNumber(request.getReferenceNumber())
                .notes(request.getNotes())
                .receivedBy(currentUser)
                .build();

        purchasePaymentRepository.save(payment);

        // Update purchase paid amount
        BigDecimal newPaidAmount = purchase.getPaidAmount().add(request.getAmount());
        purchase.setPaidAmount(newPaidAmount);
        purchase.updatePaymentStatus();
        purchaseOrderRepository.save(purchase);

        // Update supplier balance (reduce debt)
        supplierService.updateBalance(purchase.getSupplier().getId(), request.getAmount().negate());

        return mapToPaymentResponse(payment);
    }

    // ==================== RETURNS ====================

    public List<PurchaseReturnResponse> getReturns(Long purchaseId) {
        purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        return purchaseReturnRepository.findByPurchaseOrderIdOrderByReturnDateDesc(purchaseId)
                .stream()
                .map(this::mapToReturnResponse)
                .collect(Collectors.toList());
    }

    public Page<PurchaseReturnResponse> getAllReturns(PurchaseReturnStatus status, Pageable pageable) {
        if (status != null) {
            return purchaseReturnRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                    .map(this::mapToReturnResponse);
        }
        return purchaseReturnRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToReturnResponse);
    }

    public PurchaseReturnResponse getReturnById(Long returnId) {
        PurchaseReturn returnOrder = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));
        return mapToReturnResponse(returnOrder);
    }

    @Transactional
    public PurchaseReturnResponse createReturn(Long purchaseId, ReturnRequest request) {
        PurchaseOrder purchase = purchaseOrderRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", purchaseId));

        if (purchase.getStatus() != PurchaseOrderStatus.RECEIVED) {
            throw new BadRequestException("Faqat qabul qilingan xaridlardan qaytarish mumkin");
        }

        User currentUser = getCurrentUser();
        String returnNumber = generateReturnNumber();

        // Calculate refund amount and validate quantities
        BigDecimal refundAmount = BigDecimal.ZERO;
        for (ReturnItemRequest itemRequest : request.getItems()) {
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(itemRequest.getProductId()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Mahsulot xaridda mavjud emas: " + itemRequest.getProductId()));

            if (itemRequest.getQuantity() > purchaseItem.getReceivedQuantity()) {
                throw new BadRequestException("Qaytarish miqdori qabul qilingan miqdordan (" +
                        purchaseItem.getReceivedQuantity() + ") katta bo'lishi mumkin emas");
            }

            BigDecimal itemRefund = purchaseItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            refundAmount = refundAmount.add(itemRefund);
        }

        // Create return
        PurchaseReturn purchaseReturn = PurchaseReturn.builder()
                .returnNumber(returnNumber)
                .purchaseOrder(purchase)
                .returnDate(request.getReturnDate())
                .reason(request.getReason())
                .status(PurchaseReturnStatus.PENDING)
                .refundAmount(refundAmount)
                .createdBy(currentUser)
                .build();

        // Create return items
        for (ReturnItemRequest itemRequest : request.getItems()) {
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(itemRequest.getProductId()))
                    .findFirst()
                    .get();

            PurchaseReturnItem returnItem = PurchaseReturnItem.builder()
                    .purchaseReturn(purchaseReturn)
                    .product(purchaseItem.getProduct())
                    .returnedQuantity(itemRequest.getQuantity())
                    .unitPrice(purchaseItem.getUnitPrice())
                    .totalPrice(purchaseItem.getUnitPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())))
                    .build();

            purchaseReturn.addItem(returnItem);
        }

        purchaseReturnRepository.save(purchaseReturn);
        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public PurchaseReturnResponse approveReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.PENDING) {
            throw new BadRequestException("Faqat kutilayotgan qaytarishlarni tasdiqlash mumkin");
        }

        User currentUser = getCurrentUser();
        purchaseReturn.setStatus(PurchaseReturnStatus.APPROVED);
        purchaseReturn.setApprovedBy(currentUser);
        purchaseReturn.setApprovedAt(LocalDate.now());

        purchaseReturnRepository.save(purchaseReturn);
        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public PurchaseReturnResponse completeReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.APPROVED) {
            throw new BadRequestException("Faqat tasdiqlangan qaytarishlarni yakunlash mumkin");
        }

        User currentUser = getCurrentUser();
        PurchaseOrder purchase = purchaseReturn.getPurchaseOrder();

        // Process each return item
        for (PurchaseReturnItem returnItem : purchaseReturn.getItems()) {
            Product product = returnItem.getProduct();

            // Create stock movement (OUT)
            int previousStock = product.getQuantity();
            int newStock = previousStock - returnItem.getReturnedQuantity();

            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.OUT)
                    .quantity(returnItem.getReturnedQuantity())
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .referenceType("PURCHASE_RETURN")
                    .referenceId(purchaseReturn.getId())
                    .notes("Qaytarish: " + purchaseReturn.getReturnNumber())
                    .createdBy(currentUser)
                    .build();

            stockMovementRepository.save(movement);

            // Update product stock
            product.setQuantity(newStock);
            productRepository.save(product);

            // Update purchase order item received quantity
            PurchaseOrderItem purchaseItem = purchase.getItems().stream()
                    .filter(i -> i.getProduct().getId().equals(product.getId()))
                    .findFirst()
                    .orElse(null);

            if (purchaseItem != null) {
                purchaseItem.setReceivedQuantity(
                        purchaseItem.getReceivedQuantity() - returnItem.getReturnedQuantity());
            }
        }

        // Update supplier balance (reduce debt / add credit)
        supplierService.updateBalance(purchase.getSupplier().getId(),
                purchaseReturn.getRefundAmount().negate());

        // Update purchase total and paid amounts
        purchase.setTotalAmount(purchase.getTotalAmount().subtract(purchaseReturn.getRefundAmount()));
        if (purchase.getPaidAmount().compareTo(purchase.getTotalAmount()) > 0) {
            purchase.setPaidAmount(purchase.getTotalAmount());
        }
        purchase.updatePaymentStatus();
        purchaseOrderRepository.save(purchase);

        purchaseReturn.setStatus(PurchaseReturnStatus.COMPLETED);
        purchaseReturnRepository.save(purchaseReturn);

        return mapToReturnResponse(purchaseReturn);
    }

    @Transactional
    public void deleteReturn(Long returnId) {
        PurchaseReturn purchaseReturn = purchaseReturnRepository.findById(returnId)
                .orElseThrow(() -> new ResourceNotFoundException("Qaytarish", "id", returnId));

        if (purchaseReturn.getStatus() != PurchaseReturnStatus.PENDING) {
            throw new BadRequestException("Faqat kutilayotgan qaytarishlarni o'chirish mumkin");
        }

        purchaseReturnRepository.delete(purchaseReturn);
    }

    // ==================== HELPERS ====================

    private PaymentStatus calculatePaymentStatus(BigDecimal paidAmount, BigDecimal totalAmount) {
        if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) == 0) {
            return PaymentStatus.UNPAID;
        } else if (paidAmount.compareTo(totalAmount) >= 0) {
            return PaymentStatus.PAID;
        } else {
            return PaymentStatus.PARTIAL;
        }
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

    private String generateReturnNumber() {
        String prefix = "RT-";
        Integer maxNum = purchaseReturnRepository.findMaxReturnNumber(prefix);
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
        int paymentCount = purchase.getPayments() != null ? purchase.getPayments().size() : 0;
        int returnCount = purchase.getReturns() != null ? purchase.getReturns().size() : 0;

        return PurchaseOrderResponse.builder()
                .id(purchase.getId())
                .orderNumber(purchase.getOrderNumber())
                .supplierId(purchase.getSupplier().getId())
                .supplierName(purchase.getSupplier().getName())
                .orderDate(purchase.getOrderDate())
                .dueDate(purchase.getDueDate())
                .totalAmount(purchase.getTotalAmount())
                .paidAmount(purchase.getPaidAmount())
                .debtAmount(purchase.getTotalAmount().subtract(purchase.getPaidAmount()))
                .status(purchase.getStatus())
                .paymentStatus(purchase.getPaymentStatus())
                .notes(purchase.getNotes())
                .itemCount(itemCount)
                .totalQuantity(totalQuantity)
                .paymentCount(paymentCount)
                .returnCount(returnCount)
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

    private PurchasePaymentResponse mapToPaymentResponse(PurchasePayment payment) {
        return PurchasePaymentResponse.builder()
                .id(payment.getId())
                .purchaseOrderId(payment.getPurchaseOrder().getId())
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .paymentMethod(payment.getPaymentMethod())
                .referenceNumber(payment.getReferenceNumber())
                .notes(payment.getNotes())
                .receivedByName(payment.getReceivedBy().getFullName())
                .createdAt(payment.getCreatedAt())
                .build();
    }

    private PurchaseReturnResponse mapToReturnResponse(PurchaseReturn purchaseReturn) {
        List<PurchaseReturnItemResponse> items = purchaseReturn.getItems().stream()
                .map(item -> PurchaseReturnItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .productSku(item.getProduct().getSku())
                        .returnedQuantity(item.getReturnedQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return PurchaseReturnResponse.builder()
                .id(purchaseReturn.getId())
                .returnNumber(purchaseReturn.getReturnNumber())
                .purchaseOrderId(purchaseReturn.getPurchaseOrder().getId())
                .purchaseOrderNumber(purchaseReturn.getPurchaseOrder().getOrderNumber())
                .supplierId(purchaseReturn.getPurchaseOrder().getSupplier().getId())
                .supplierName(purchaseReturn.getPurchaseOrder().getSupplier().getName())
                .returnDate(purchaseReturn.getReturnDate())
                .reason(purchaseReturn.getReason())
                .status(purchaseReturn.getStatus())
                .refundAmount(purchaseReturn.getRefundAmount())
                .items(items)
                .createdByName(purchaseReturn.getCreatedBy().getFullName())
                .approvedByName(purchaseReturn.getApprovedBy() != null ?
                        purchaseReturn.getApprovedBy().getFullName() : null)
                .approvedAt(purchaseReturn.getApprovedAt())
                .createdAt(purchaseReturn.getCreatedAt())
                .build();
    }
}
