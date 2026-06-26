package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CreateShopOrderRequest;
import uz.shinamagazin.api.dto.response.ShopOrderResponse;
import uz.shinamagazin.api.dto.response.ShopOrderStatusResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.entity.ShopOrderItem;
import uz.shinamagazin.api.enums.ShopDeliveryMethod;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.ShopOrderRepository;

import java.math.BigDecimal;

/**
 * Storefront buyurtma xizmati (guest checkout).
 *
 * MUHIM: narx SERVERDA hisoblanadi — mijoz yuborgan narxga ishonilmaydi
 * (faqat productId + quantity olinadi, narx mahsulotning joriy sellingPrice'i).
 *
 * ⏳ Stok rezervatsiyasi/yetishmasligi tekshiruvi bu versiyada YO'Q — buyurtma
 * shunchaki qayd etiladi (operator qo'lda tasdiqlaydi). Konkurent stok boshqaruvi
 * keyingi bosqichda (to'lov gateway bilan birga).
 */
@Service
@RequiredArgsConstructor
public class ShopOrderService {

    private final ShopOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final StaffNotificationService staffNotificationService;

    private static final BigDecimal DELIVERY_FEE = new BigDecimal("30000");
    private static final BigDecimal FREE_DELIVERY_THRESHOLD = new BigDecimal("1000000");

    @Transactional
    public ShopOrderResponse createOrder(CreateShopOrderRequest req, Long customerId) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new BadRequestException("Buyurtma bo'sh bo'lishi mumkin emas");
        }

        // Mijoz login qilgan bo'lsa buyurtma uning akkauntiga bog'lanadi (ixtiyoriy; guest'da null).
        Customer customer = (customerId != null)
                ? customerRepository.findById(customerId).orElse(null) : null;

        ShopOrder order = ShopOrder.builder()
                .orderNo(generateOrderNo())
                .customer(customer)
                .customerName(req.getName().trim())
                .customerPhone(req.getPhone().trim())
                .customerEmail(req.getEmail() != null && !req.getEmail().isBlank() ? req.getEmail().trim() : null)
                .deliveryMethod(req.getDeliveryMethod())
                .deliveryAddress(req.getAddress() != null && !req.getAddress().isBlank() ? req.getAddress().trim() : null)
                .deliveryNote(req.getNote() != null && !req.getNote().isBlank() ? req.getNote().trim() : null)
                .paymentMethod(req.getPayment())
                .status(ShopOrderStatus.NEW)
                .subtotal(BigDecimal.ZERO)
                .deliveryFee(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateShopOrderRequest.Item reqItem : req.getItems()) {
            Product product = productRepository.findById(reqItem.getProductId())
                    .filter(p -> Boolean.TRUE.equals(p.getActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Mahsulot", "id", reqItem.getProductId()));

            // Stok rezervatsiya — zaxira yetarli bo'lsa kamaytiriladi.
            // Product @Version optimistik qulf konkurent buyurtmalarni himoyalaydi.
            if (product.getQuantity() < reqItem.getQuantity()) {
                throw new BadRequestException("Zaxira yetarli emas: " + product.getName()
                        + " (qoldiq: " + product.getQuantity() + ")");
            }
            product.setQuantity(product.getQuantity() - reqItem.getQuantity());
            productRepository.save(product);

            BigDecimal unitPrice = product.getSellingPrice(); // SERVER narxi
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(reqItem.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            ShopOrderItem item = ShopOrderItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .sizeString(product.getSizeString())
                    .quantity(reqItem.getQuantity())
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build();
            order.addItem(item);
        }

        BigDecimal deliveryFee = calcDeliveryFee(req.getDeliveryMethod(), subtotal);
        order.setSubtotal(subtotal);
        order.setDeliveryFee(deliveryFee);
        order.setTotalAmount(subtotal.add(deliveryFee));

        ShopOrder saved = orderRepository.save(order);

        // Xodimlarga real-time bildirishnoma (header qo'ng'irog'i + WebSocket push).
        // SaleService.notifyNewOrder bilan bir naqsh; referenceType "SHOP_ORDER".
        staffNotificationService.notifyNewShopOrder(
                saved.getOrderNo(), saved.getCustomerName(), saved.getTotalAmount(), saved.getId());

        return ShopOrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ShopOrderResponse getByOrderNo(String orderNo) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
        return ShopOrderResponse.from(order);
    }

    /** Ommaviy (guest): buyurtma holati — shaxsiy ma'lumotsiz (tasdiq sahifasi uchun). */
    @Transactional(readOnly = true)
    public ShopOrderStatusResponse getStatusByOrderNo(String orderNo) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
        return ShopOrderStatusResponse.from(order);
    }

    /** Xodim uchun: buyurtmalar ro'yxati (eng yangi birinchi), ixtiyoriy holat filtri. */
    @Transactional(readOnly = true)
    public Page<ShopOrderResponse> getOrders(ShopOrderStatus status, Pageable pageable) {
        Page<ShopOrder> page = (status == null)
                ? orderRepository.findAllByOrderByCreatedAtDesc(pageable)
                : orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        return page.map(ShopOrderResponse::from);
    }

    /** Xodim uchun: buyurtma holatini yangilash (tasdiqlash/bekor qilish/yakunlash). */
    @Transactional
    public ShopOrderResponse updateStatus(String orderNo, ShopOrderStatus status) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
        order.setStatus(status);
        return ShopOrderResponse.from(orderRepository.save(order));
    }

    private BigDecimal calcDeliveryFee(ShopDeliveryMethod method, BigDecimal subtotal) {
        if (method == ShopDeliveryMethod.PICKUP) return BigDecimal.ZERO;
        return subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0 ? BigDecimal.ZERO : DELIVERY_FEE;
    }

    private String generateOrderNo() {
        String base = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        String no = "PR-" + base;
        while (orderRepository.existsByOrderNo(no)) {
            no = "PR-" + base + "-" + (int) (Math.random() * 9000 + 1000);
        }
        return no;
    }
}
