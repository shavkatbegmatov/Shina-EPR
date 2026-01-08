package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.SaleItemRequest;
import uz.shinamagazin.api.dto.request.SaleRequest;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.*;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.InsufficientStockException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.*;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final DebtRepository debtRepository;
    private final StockMovementRepository stockMovementRepository;

    public Page<SaleResponse> getAllSales(Pageable pageable) {
        return saleRepository.findAll(pageable)
                .map(SaleResponse::from);
    }

    public SaleResponse getSaleById(Long id) {
        Sale sale = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sotuv", "id", id));
        return SaleResponse.from(sale);
    }

    public List<SaleResponse> getTodaySales() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return saleRepository.findTodaySales(startOfDay, endOfDay).stream()
                .map(SaleResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public SaleResponse createSale(SaleRequest request) {
        User currentUser = getCurrentUser();

        // Validate and get customer if provided
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", request.getCustomerId()));
        }

        // Create sale
        Sale sale = Sale.builder()
                .invoiceNumber(generateInvoiceNumber())
                .customer(customer)
                .saleDate(LocalDateTime.now())
                .paymentMethod(request.getPaymentMethod())
                .notes(request.getNotes())
                .createdBy(currentUser)
                .build();

        // Calculate subtotal and add items
        BigDecimal subtotal = BigDecimal.ZERO;
        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", itemRequest.getProductId()));

            // Check stock
            if (product.getQuantity() < itemRequest.getQuantity()) {
                throw new InsufficientStockException(
                        product.getName(),
                        product.getQuantity(),
                        itemRequest.getQuantity()
                );
            }

            // Get price
            BigDecimal unitPrice = itemRequest.getCustomPrice() != null ?
                    itemRequest.getCustomPrice() : product.getSellingPrice();

            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            BigDecimal discount = itemRequest.getDiscount() != null ? itemRequest.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemFinalTotal = itemTotal.subtract(discount);

            SaleItem saleItem = SaleItem.builder()
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(unitPrice)
                    .discount(discount)
                    .totalPrice(itemFinalTotal)
                    .build();

            sale.addItem(saleItem);
            subtotal = subtotal.add(itemFinalTotal);

            // Reduce stock
            int previousStock = product.getQuantity();
            product.setQuantity(previousStock - itemRequest.getQuantity());
            productRepository.save(product);

            // Record stock movement
            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.OUT)
                    .quantity(-itemRequest.getQuantity())
                    .previousStock(previousStock)
                    .newStock(product.getQuantity())
                    .referenceType("SALE")
                    .notes("Sotuv: " + sale.getInvoiceNumber())
                    .createdBy(currentUser)
                    .build();
            stockMovementRepository.save(movement);
        }

        // Apply discounts
        sale.setSubtotal(subtotal);
        BigDecimal discountAmount = request.getDiscountAmount() != null ?
                request.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal discountPercent = request.getDiscountPercent() != null ?
                request.getDiscountPercent() : BigDecimal.ZERO;

        if (discountPercent.compareTo(BigDecimal.ZERO) > 0) {
            discountAmount = subtotal.multiply(discountPercent)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        sale.setDiscountAmount(discountAmount);
        sale.setDiscountPercent(discountPercent);

        BigDecimal totalAmount = subtotal.subtract(discountAmount);
        sale.setTotalAmount(totalAmount);

        // Handle payment
        BigDecimal paidAmount = request.getPaidAmount();
        sale.setPaidAmount(paidAmount);

        BigDecimal debtAmount = totalAmount.subtract(paidAmount);
        sale.setDebtAmount(debtAmount.max(BigDecimal.ZERO));

        // Determine payment status
        if (paidAmount.compareTo(totalAmount) >= 0) {
            sale.setPaymentStatus(PaymentStatus.PAID);
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            sale.setPaymentStatus(PaymentStatus.PARTIAL);
        } else {
            sale.setPaymentStatus(PaymentStatus.UNPAID);
        }

        sale.setStatus(SaleStatus.COMPLETED);

        Sale savedSale = saleRepository.save(sale);

        // Create debt record if partial/unpaid
        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (customer == null) {
                throw new BadRequestException("Qarzga sotish uchun mijoz tanlash shart");
            }

            Debt debt = Debt.builder()
                    .customer(customer)
                    .sale(savedSale)
                    .originalAmount(debtAmount)
                    .remainingAmount(debtAmount)
                    .dueDate(LocalDate.now().plusDays(30))
                    .status(DebtStatus.ACTIVE)
                    .build();
            debtRepository.save(debt);

            // Update customer balance
            customer.setBalance(customer.getBalance().subtract(debtAmount));
            customerRepository.save(customer);
        }

        return SaleResponse.from(savedSale);
    }

    @Transactional
    public SaleResponse cancelSale(Long id) {
        Sale sale = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sotuv", "id", id));

        if (sale.getStatus() == SaleStatus.CANCELLED) {
            throw new BadRequestException("Bu sotuv allaqachon bekor qilingan");
        }

        User currentUser = getCurrentUser();

        // Restore stock
        for (SaleItem item : sale.getItems()) {
            Product product = item.getProduct();
            int previousStock = product.getQuantity();
            product.setQuantity(previousStock + item.getQuantity());
            productRepository.save(product);

            // Record stock movement
            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.IN)
                    .quantity(item.getQuantity())
                    .previousStock(previousStock)
                    .newStock(product.getQuantity())
                    .referenceType("SALE_CANCEL")
                    .referenceId(sale.getId())
                    .notes("Sotuv bekor qilindi: " + sale.getInvoiceNumber())
                    .createdBy(currentUser)
                    .build();
            stockMovementRepository.save(movement);
        }

        // Cancel related debts
        if (sale.getCustomer() != null && sale.getDebtAmount().compareTo(BigDecimal.ZERO) > 0) {
            Customer customer = sale.getCustomer();
            customer.setBalance(customer.getBalance().add(sale.getDebtAmount()));
            customerRepository.save(customer);
        }

        sale.setStatus(SaleStatus.CANCELLED);
        return SaleResponse.from(saleRepository.save(sale));
    }

    private String generateInvoiceNumber() {
        String prefix = "INV" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        Long maxNumber = saleRepository.findMaxInvoiceNumber(prefix);
        long nextNumber = (maxNumber != null ? maxNumber : 0L) + 1;
        return prefix + String.format("%04d", nextNumber);
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }
}
