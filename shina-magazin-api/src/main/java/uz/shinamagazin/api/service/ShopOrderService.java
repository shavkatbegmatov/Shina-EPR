package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.ShopOrderRepository;
import uz.shinamagazin.api.repository.specification.ShopOrderSpecifications;
import uz.shinamagazin.api.service.notify.OrderNotificationService;
import uz.shinamagazin.api.util.PhoneNumberUtils;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Storefront buyurtma xizmati (guest checkout).
 *
 * MUHIM: narx SERVERDA hisoblanadi — mijoz yuborgan narxga ishonilmaydi
 * (faqat productId + quantity olinadi, narx mahsulotning joriy sellingPrice'i).
 *
 * Zaxira buyurtma yaratilganda REZERV qilinadi (kamaytiriladi); {@code Product}
 * dagi {@code @Version} konkurent buyurtmalarda oversell'ni to'sadi. Bekor qilishda
 * zaxira qaytariladi. Onlayn to'lovi boshlanib tugallanmagan buyurtmalar
 * {@link #expireUnpaidOnlineOrders} orqali (scheduler) avtomatik bekor qilinadi —
 * aks holda tashlab ketilgan savat zaxirani abadiy band qilib turardi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShopOrderService {

    private final ShopOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final StaffNotificationService staffNotificationService;
    private final OrderNotificationService orderNotificationService;
    private final SettingsService settingsService;

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
                .customerPhone(PhoneNumberUtils.normalize(req.getPhone()))
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

        // Mijozga buyurtma tasdig'i (SMS/email — config-gated; xatolar yutiladi, buyurtmani buzmaydi)
        try {
            orderNotificationService.sendOrderConfirmation(saved);
        } catch (Exception e) {
            log.warn("Mijoz xabarnomasi xatosi ({}): {}", saved.getOrderNo(), e.getMessage());
        }

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
    public Page<ShopOrderResponse> getOrders(
            ShopOrderStatus status, Long customerId, String search, Pageable pageable) {
        String customerPhone = null;
        if (customerId != null) {
            customerPhone = customerRepository.findById(customerId)
                    .map(Customer::getPhone)
                    .map(PhoneNumberUtils::normalize)
                    .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));
        }
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim();
        Pageable sortedPageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                        Sort.by(Sort.Direction.DESC, "createdAt"));

        return orderRepository.findAll(
                        ShopOrderSpecifications.withFilters(
                                status, customerId, customerPhone, normalizedSearch),
                        sortedPageable)
                .map(ShopOrderResponse::from);
    }

    /** Mijoz akkaunti: o'z storefront buyurtmalari (customerId YOKI telefon bo'yicha —
     * login'dan oldingi guest buyurtmalarni ham qamraydi). */
    @Transactional(readOnly = true)
    public Page<ShopOrderResponse> getCustomerOrders(Long customerId, String phone, Pageable pageable) {
        return orderRepository
                .findByCustomerIdOrCustomerPhoneOrderByCreatedAtDesc(
                        customerId, PhoneNumberUtils.normalize(phone), pageable)
                .map(ShopOrderResponse::from);
    }

    /** Mijoz akkaunti: bitta buyurtma tafsiloti — FAQAT o'ziniki. Begona buyurtma
     * uchun 404 (403 emas) — buyurtma raqamining mavjudligi oshkor bo'lmaydi. */
    @Transactional(readOnly = true)
    public ShopOrderResponse getCustomerOrder(Long customerId, String phone, String orderNo) {
        String normalizedPhone = PhoneNumberUtils.normalize(phone);
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .filter(o -> isOwnedBy(o, customerId, normalizedPhone))
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
        return ShopOrderResponse.from(order);
    }

    /** Egalik: buyurtma mijoz akkauntiga bog'langan YOKI telefoni mos —
     * {@link #getCustomerOrders} ro'yxati bilan bir xil qamrov (login'gacha guest buyurtmalar). */
    private boolean isOwnedBy(ShopOrder order, Long customerId, String normalizedPhone) {
        if (customerId != null && order.getCustomer() != null
                && customerId.equals(order.getCustomer().getId())) {
            return true;
        }
        return normalizedPhone != null && normalizedPhone.equals(order.getCustomerPhone());
    }

    /** Xodim uchun: buyurtma holatini yangilash (tasdiqlash/bekor qilish/yakunlash). */
    @Transactional
    public ShopOrderResponse updateStatus(String orderNo, ShopOrderStatus status) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));

        ShopOrderStatus previousStatus = order.getStatus();
        if (previousStatus == status) {
            return ShopOrderResponse.from(order);
        }

        if (status == ShopOrderStatus.CANCELLED && previousStatus != ShopOrderStatus.CANCELLED) {
            restoreReservedStock(order);
        } else if (previousStatus == ShopOrderStatus.CANCELLED && status != ShopOrderStatus.CANCELLED) {
            reserveStockAgain(order);
        }

        order.setStatus(status);
        return ShopOrderResponse.from(orderRepository.save(order));
    }

    private void restoreReservedStock(ShopOrder order) {
        order.getItems().forEach(item -> {
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() + item.getQuantity());
            productRepository.save(product);
        });
    }

    private void reserveStockAgain(ShopOrder order) {
        order.getItems().forEach(item -> {
            Product product = item.getProduct();
            if (product.getQuantity() < item.getQuantity()) {
                throw new BadRequestException("Buyurtmani qayta ochish uchun zaxira yetarli emas: "
                        + product.getName() + " (qoldiq: " + product.getQuantity() + ")");
            }
            product.setQuantity(product.getQuantity() - item.getQuantity());
            productRepository.save(product);
        });
    }

    /**
     * Onlayn to'lovi boshlanib tugallanmagan eskirgan buyurtmalarni bekor qiladi va
     * zaxirani qaytaradi (scheduler chaqiradi).
     *
     * <p>Faqat {@code NEW} + ({@code FAILED} yoki provayder tranzaksiyasi YO'Q
     * {@code PROCESSING}) buyurtmalar: Payme {@code CreateTransaction} qilgan buyurtmani
     * Payme o'zi yakunlaydi yoki bekor qiladi, unga tegilmaydi. Naqd (yetkazishda to'lov)
     * buyurtmalar {@code PENDING} bo'lib qoladi — ularni operator boshqaradi.
     *
     * @return bekor qilingan buyurtmalar soni
     */
    @Transactional
    public int expireUnpaidOnlineOrders(LocalDateTime cutoff) {
        List<ShopOrder> stale = orderRepository.findExpiredUnpaidOnlineOrders(cutoff);
        for (ShopOrder order : stale) {
            restoreReservedStock(order);
            order.setStatus(ShopOrderStatus.CANCELLED);
            order.setPaymentStatus(ShopPaymentStatus.CANCELLED);
            orderRepository.save(order);
            log.info("Shop order {} expired: online payment not completed since {}", order.getOrderNo(), cutoff);
        }
        return stale.size();
    }

    /**
     * Yetkazib berish narxi Sozlamalardan (ilgari kodda qattiq yozilgan edi — o'zgartirish
     * uchun deploy kerak bo'lardi). Olib ketish bepul; chegaradan oshgan savat ham bepul.
     */
    private BigDecimal calcDeliveryFee(ShopDeliveryMethod method, BigDecimal subtotal) {
        if (method == ShopDeliveryMethod.PICKUP) return BigDecimal.ZERO;
        BigDecimal threshold = BigDecimal.valueOf(settingsService.getFreeDeliveryThreshold());
        return subtotal.compareTo(threshold) >= 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(settingsService.getDeliveryFee());
    }

    private static final SecureRandom RANDOM = new SecureRandom();
    /** Chalkash belgilarsiz alifbo (0/O, 1/I yo'q) — telefonda aytib berish oson. */
    private static final String ORDER_NO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ORDER_NO_LENGTH = 8;

    /**
     * Tasodifiy, taxminlab bo'lmaydigan buyurtma raqami.
     *
     * <p>Ilgari {@code currentTimeMillis} (base36) ishlatilardi — raqamlar ketma-ket va
     * taxminlanadigan edi. Ommaviy {@code GET /orders/{no}/status} va
     * {@code POST /orders/{no}/pay} endpointlari orqali begona buyurtmalarning holatini
     * ko'rish va ularni to'lovga yo'naltirish mumkin bo'lardi. 8 belgi × 32 = 2^40 variant.
     */
    private String generateOrderNo() {
        while (true) {
            StringBuilder sb = new StringBuilder("PR-");
            for (int i = 0; i < ORDER_NO_LENGTH; i++) {
                sb.append(ORDER_NO_ALPHABET.charAt(RANDOM.nextInt(ORDER_NO_ALPHABET.length())));
            }
            String no = sb.toString();
            if (!orderRepository.existsByOrderNo(no)) {
                return no;
            }
        }
    }
}
