package uz.shinamagazin.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.config.PaymentProperties;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.service.ShopPaymentService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Payme Merchant API (JSON-RPC) webhook. Payme to'lov jarayonida shu endpointni
 * chaqiradi. Auth: Basic `Paycom:<merchant_key>`.
 *
 * ⚠️ ASOSIY metodlar (CheckPerformTransaction/CreateTransaction/PerformTransaction/
 * CancelTransaction/CheckTransaction) qamrab olingan; holat buyurtma maydonlarida
 * saqlanadi (soddalashtirilgan — to'liq Payme muvofiqligi uchun alohida
 * transactions jadvali kerak bo'lishi mumkin). Foydalanuvchi sandbox'da tasdiqlasin.
 * params.account.order_id = buyurtma orderNo.
 */
@RestController
@RequestMapping("/v1/payments/payme")
@RequiredArgsConstructor
@Slf4j
public class PaymeWebhookController {

    private final ShopPaymentService paymentService;
    private final PaymentProperties props;

    // Payme xato kodlari
    private static final int ERR_AUTH = -32504;
    private static final int ERR_METHOD = -32601;
    private static final int ERR_ORDER = -31050;   // order topilmadi
    private static final int ERR_AMOUNT = -31001;  // noto'g'ri summa
    private static final int ERR_TX_NOT_FOUND = -31003;
    private static final int ERR_CANT_PERFORM = -31008;

    @PostMapping
    public ResponseEntity<Map<String, Object>> handle(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, Object> req) {

        Object id = req.get("id");
        if (!authorized(auth)) {
            return ResponseEntity.ok(rpcError(id, ERR_AUTH, "Insufficient privilege"));
        }
        String method = String.valueOf(req.get("method"));
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) req.getOrDefault("params", Map.of());

        try {
            return ResponseEntity.ok(switch (method) {
                case "CheckPerformTransaction" -> checkPerform(id, params);
                case "CreateTransaction" -> createTransaction(id, params);
                case "PerformTransaction" -> performTransaction(id, params);
                case "CancelTransaction" -> cancelTransaction(id, params);
                case "CheckTransaction" -> checkTransaction(id, params);
                default -> rpcError(id, ERR_METHOD, "Method not found");
            });
        } catch (Exception e) {
            // Xato matni provayderga QAYTARILMAYDI — JPA/SQL istisnolari jadval va
            // ustun nomlarini oshkor qiladi. Tafsilot faqat serverda logga tushadi.
            log.error("Payme webhook error (method={})", method, e);
            return ResponseEntity.ok(rpcError(id, ERR_CANT_PERFORM, "Internal error"));
        }
    }

    private Map<String, Object> checkPerform(Object id, Map<String, Object> params) {
        ShopOrder order = orderFromParams(params);
        if (order == null) return rpcError(id, ERR_ORDER, "Order not found");
        // Bekor qilingan (masalan, muddati o'tib zaxirasi bo'shatilgan) buyurtmani
        // to'lab bo'lmaydi — aks holda to'langan-u, zaxirasi yo'q buyurtma paydo bo'lardi.
        if (order.getStatus() == ShopOrderStatus.CANCELLED) return rpcError(id, ERR_ORDER, "Order cancelled");
        if (!amountMatches(order, params)) return rpcError(id, ERR_AMOUNT, "Incorrect amount");
        return rpcResult(id, Map.of("allow", true));
    }

    /**
     * Idempotent: Payme bir xil {@code id} bilan qayta chaqirsa o'sha {@code create_time}
     * qaytadi. Boshqa {@code id} bilan kelsa (buyurtmada allaqachon faol tranzaksiya bor)
     * rad etiladi — bitta buyurtmaga ikkita tranzaksiya ochib bo'lmaydi.
     */
    private Map<String, Object> createTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderFromParams(params);
        if (order == null) return rpcError(id, ERR_ORDER, "Order not found");
        if (order.getStatus() == ShopOrderStatus.CANCELLED) return rpcError(id, ERR_ORDER, "Order cancelled");
        if (!amountMatches(order, params)) return rpcError(id, ERR_AMOUNT, "Incorrect amount");
        if (order.getPaymentStatus() == ShopPaymentStatus.PAID) return rpcError(id, ERR_CANT_PERFORM, "Already paid");

        String paymeTxId = String.valueOf(params.get("id"));
        if (order.getProviderTransactionId() != null
                && !paymeTxId.equals(order.getProviderTransactionId())
                && order.getPaymentStatus() == ShopPaymentStatus.PROCESSING) {
            return rpcError(id, ERR_CANT_PERFORM, "Another transaction is in progress for this order");
        }

        ShopOrder attached = paymentService.attachProviderTransaction(order.getOrderNo(), paymeTxId);
        Map<String, Object> res = new HashMap<>();
        res.put("create_time", epochMs(attached.getPaymentCreatedAt(), epochMs(attached)));
        res.put("transaction", attached.getOrderNo());
        res.put("state", 1);
        return rpcResult(id, res);
    }

    /** Idempotent: allaqachon to'langan bo'lsa saqlangan {@code perform_time} qaytadi. */
    private Map<String, Object> performTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        if (order.getPaymentCancelledAt() != null) return rpcError(id, ERR_CANT_PERFORM, "Transaction cancelled");
        if (order.getStatus() == ShopOrderStatus.CANCELLED) return rpcError(id, ERR_CANT_PERFORM, "Order cancelled");

        ShopOrder paid = paymentService.markPaid(order.getOrderNo(), String.valueOf(params.get("id")));
        Map<String, Object> res = new HashMap<>();
        res.put("perform_time", epochMs(paid.getPaidAt(), System.currentTimeMillis()));
        res.put("transaction", paid.getOrderNo());
        res.put("state", 2);
        return rpcResult(id, res);
    }

    /**
     * Bekor qilish vaqti va sababi saqlanadi (takror chaqiruvda o'zgarmaydi).
     * To'lovdan keyingi bekor — qaytarish (state -2), oldingisi — state -1.
     */
    private Map<String, Object> cancelTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        Integer reason = parseReason(params.get("reason"));
        ShopOrder cancelled = paymentService.cancelByProvider(order.getOrderNo(), reason);
        Map<String, Object> res = new HashMap<>();
        res.put("cancel_time", epochMs(cancelled.getPaymentCancelledAt(), System.currentTimeMillis()));
        res.put("transaction", cancelled.getOrderNo());
        res.put("state", cancelled.getPaymentStatus() == ShopPaymentStatus.REFUNDED ? -2 : -1);
        return rpcResult(id, res);
    }

    private Map<String, Object> checkTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        int state = switch (order.getPaymentStatus()) {
            case PAID -> 2;
            case PROCESSING, PENDING -> 1;
            case CANCELLED, REFUNDED -> -2;
            case FAILED -> -1;
        };
        Map<String, Object> res = new HashMap<>();
        res.put("create_time", epochMs(order.getPaymentCreatedAt(), epochMs(order)));
        res.put("perform_time", epochMs(order.getPaidAt(), 0L));
        res.put("cancel_time", epochMs(order.getPaymentCancelledAt(), 0L));
        res.put("transaction", order.getOrderNo());
        res.put("state", state);
        res.put("reason", order.getPaymentCancelReason());
        return rpcResult(id, res);
    }

    private static Integer parseReason(Object raw) {
        if (raw == null) return null;
        try {
            return Integer.valueOf(String.valueOf(raw));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static long epochMs(java.time.LocalDateTime time, long fallback) {
        return time != null ? time.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : fallback;
    }

    // --- helpers ---

    private boolean authorized(String auth) {
        // Integratsiya o'chiq bo'lsa hech qanday webhook qabul qilinmaydi (fail-closed).
        if (!props.getPayme().isEnabled()) {
            log.warn("Payme webhook chaqirildi, lekin integratsiya o'chiq (PAYME_ENABLED=false) — rad etildi");
            return false;
        }
        if (auth == null || !auth.startsWith("Basic ")) return false;
        try {
            String decoded = new String(Base64.getDecoder().decode(auth.substring(6)), StandardCharsets.UTF_8);
            int idx = decoded.indexOf(':');
            String key = idx >= 0 ? decoded.substring(idx + 1) : "";
            String expected = props.getPayme().getKey();
            return !expected.isBlank() && MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    key.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    private ShopOrder orderFromParams(Map<String, Object> params) {
        @SuppressWarnings("unchecked")
        Map<String, Object> account = (Map<String, Object>) params.getOrDefault("account", Map.of());
        Object orderNo = account.get("order_id");
        if (orderNo == null) return null;
        try { return paymentService.getOrder(String.valueOf(orderNo)); } catch (Exception e) { return null; }
    }

    private ShopOrder orderByPaymeTx(Map<String, Object> params) {
        try { return paymentService.findByProviderTx(String.valueOf(params.get("id"))); }
        catch (Exception e) { return null; }
    }

    private boolean amountMatches(ShopOrder order, Map<String, Object> params) {
        Object a = params.get("amount");
        if (a == null) return false;
        long expectedTiyin = order.getTotalAmount().multiply(BigDecimal.valueOf(100)).longValueExact();
        return Long.parseLong(String.valueOf(a)) == expectedTiyin;
    }

    private long epochMs(ShopOrder order) {
        return order.getCreatedAt() != null
                ? order.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                : System.currentTimeMillis();
    }

    private Map<String, Object> rpcResult(Object id, Map<String, Object> result) {
        Map<String, Object> m = new HashMap<>();
        m.put("result", result);
        m.put("id", id);
        return m;
    }

    private Map<String, Object> rpcError(Object id, int code, String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("code", code);
        err.put("message", message);
        Map<String, Object> m = new HashMap<>();
        m.put("error", err);
        m.put("id", id);
        return m;
    }
}
