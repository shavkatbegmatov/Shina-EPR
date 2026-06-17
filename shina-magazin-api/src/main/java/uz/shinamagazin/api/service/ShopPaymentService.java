package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.config.PaymentProperties;
import uz.shinamagazin.api.dto.response.PaymentInitResponse;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.ShopOrderRepository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.net.URLEncoder;

/**
 * Storefront to'lov xizmati — barcha usullar uchun.
 *
 * - CASH: yetkazishda to'lov (onlayn qadam yo'q, PENDING qoladi).
 * - PAYME/CLICK/CARD: provayder checkout URL yaratiladi (config'dan), mijoz
 *   o'sha sahifada to'laydi; provayder webhook orqali tasdiqlaydi -> markPaid.
 *
 * ⚠️ Checkout URL faqat tegishli provayder application.yml'da YOQILGAN va
 * kreditsiallar to'ldirilgan bo'lsa yaratiladi. Aks holda null (frontend naqd
 * sifatida davom etadi). Webhook protokollari foydalanuvchi merchant sandbox'ida
 * tasdiqlanishi shart.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShopPaymentService {

    private final ShopOrderRepository orderRepository;
    private final PaymentProperties props;

    @Transactional
    public PaymentInitResponse initiate(String orderNo) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));

        String url = switch (order.getPaymentMethod()) {
            case CASH -> null;                       // yetkazishda to'lov
            case PAYME, CARD -> buildPaymeUrl(order); // karta ham Payme orqali
            case CLICK -> buildClickUrl(order);
        };

        if (url != null && order.getPaymentStatus() == ShopPaymentStatus.PENDING) {
            order.setPaymentStatus(ShopPaymentStatus.PROCESSING);
            orderRepository.save(order);
        }

        return PaymentInitResponse.builder()
                .orderNo(order.getOrderNo())
                .method(order.getPaymentMethod().name())
                .redirectUrl(url)
                .paymentStatus(order.getPaymentStatus().name())
                .online(url != null)
                .build();
    }

    /** Payme checkout URL: base64(m=...;ac.order_id=...;a=<tiyin>;c=<return>). */
    private String buildPaymeUrl(ShopOrder order) {
        var p = props.getPayme();
        if (!p.isEnabled() || p.getMerchantId().isBlank()) return null;
        long amountTiyin = order.getTotalAmount().multiply(BigDecimal.valueOf(100)).longValueExact();
        String callback = props.getReturnUrl() + "/" + order.getOrderNo();
        String params = String.format("m=%s;ac.order_id=%s;a=%d;c=%s",
                p.getMerchantId(), order.getOrderNo(), amountTiyin, callback);
        String encoded = Base64.getEncoder().encodeToString(params.getBytes(StandardCharsets.UTF_8));
        return p.getCheckoutUrl() + "/" + encoded;
    }

    /** Click pay URL: ?service_id=&merchant_id=&amount=&transaction_param=<orderNo>&return_url=. */
    private String buildClickUrl(ShopOrder order) {
        var c = props.getClick();
        if (!c.isEnabled() || c.getMerchantId().isBlank()) return null;
        String ret = URLEncoder.encode(props.getReturnUrl() + "/" + order.getOrderNo(), StandardCharsets.UTF_8);
        return String.format("%s?service_id=%s&merchant_id=%s&amount=%s&transaction_param=%s&return_url=%s",
                c.getPayUrl(), c.getServiceId(), c.getMerchantId(),
                order.getTotalAmount().toPlainString(), order.getOrderNo(), ret);
    }

    // --- Webhook'lar (provayder) chaqiradi ---

    @Transactional
    public ShopOrder markPaid(String orderNo, String providerTxId) {
        ShopOrder order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
        order.setPaymentStatus(ShopPaymentStatus.PAID);
        order.setProviderTransactionId(providerTxId);
        order.setPaidAt(LocalDateTime.now());
        if (order.getStatus() == ShopOrderStatus.NEW) {
            order.setStatus(ShopOrderStatus.CONFIRMED); // to'langach avtomatik tasdiq
        }
        log.info("Shop order {} PAID (tx={})", orderNo, providerTxId);
        return orderRepository.save(order);
    }

    @Transactional
    public void markFailed(String orderNo) {
        orderRepository.findByOrderNo(orderNo).ifPresent(order -> {
            if (order.getPaymentStatus() != ShopPaymentStatus.PAID) {
                order.setPaymentStatus(ShopPaymentStatus.FAILED);
                orderRepository.save(order);
            }
        });
    }

    @Transactional(readOnly = true)
    public ShopOrder getOrder(String orderNo) {
        return orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Buyurtma", "orderNo", orderNo));
    }

    /** Webhook uchun: provayder tranzaksiya ID'si bo'yicha buyurtma (topilmasa null). */
    @Transactional(readOnly = true)
    public ShopOrder findByProviderTx(String providerTxId) {
        return orderRepository.findByProviderTransactionId(providerTxId).orElse(null);
    }

    @Transactional
    public ShopOrder save(ShopOrder order) {
        return orderRepository.save(order);
    }
}
