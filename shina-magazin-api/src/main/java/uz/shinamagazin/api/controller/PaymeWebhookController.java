package uz.shinamagazin.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.config.PaymentProperties;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.service.ShopPaymentService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
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
            log.error("Payme webhook error", e);
            return ResponseEntity.ok(rpcError(id, ERR_CANT_PERFORM, e.getMessage()));
        }
    }

    private Map<String, Object> checkPerform(Object id, Map<String, Object> params) {
        ShopOrder order = orderFromParams(params);
        if (order == null) return rpcError(id, ERR_ORDER, "Order not found");
        if (!amountMatches(order, params)) return rpcError(id, ERR_AMOUNT, "Incorrect amount");
        return rpcResult(id, Map.of("allow", true));
    }

    private Map<String, Object> createTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderFromParams(params);
        if (order == null) return rpcError(id, ERR_ORDER, "Order not found");
        if (!amountMatches(order, params)) return rpcError(id, ERR_AMOUNT, "Incorrect amount");
        if (order.getPaymentStatus() == ShopPaymentStatus.PAID) return rpcError(id, ERR_CANT_PERFORM, "Already paid");

        String paymeTxId = String.valueOf(params.get("id"));
        order.setProviderTransactionId(paymeTxId);
        if (order.getPaymentStatus() == ShopPaymentStatus.PENDING) {
            order.setPaymentStatus(ShopPaymentStatus.PROCESSING);
        }
        paymentService.save(order);
        Map<String, Object> res = new HashMap<>();
        res.put("create_time", epochMs(order));
        res.put("transaction", order.getOrderNo());
        res.put("state", 1);
        return rpcResult(id, res);
    }

    private Map<String, Object> performTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        ShopOrder paid = paymentService.markPaid(order.getOrderNo(), String.valueOf(params.get("id")));
        Map<String, Object> res = new HashMap<>();
        res.put("perform_time", paid.getPaidAt() != null
                ? paid.getPaidAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                : System.currentTimeMillis());
        res.put("transaction", paid.getOrderNo());
        res.put("state", 2);
        return rpcResult(id, res);
    }

    private Map<String, Object> cancelTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        paymentService.markFailed(order.getOrderNo());
        Map<String, Object> res = new HashMap<>();
        res.put("cancel_time", System.currentTimeMillis());
        res.put("transaction", order.getOrderNo());
        res.put("state", order.getPaymentStatus() == ShopPaymentStatus.PAID ? -2 : -1);
        return rpcResult(id, res);
    }

    private Map<String, Object> checkTransaction(Object id, Map<String, Object> params) {
        ShopOrder order = orderByPaymeTx(params);
        if (order == null) return rpcError(id, ERR_TX_NOT_FOUND, "Transaction not found");
        int state = switch (order.getPaymentStatus()) {
            case PAID -> 2;
            case PROCESSING -> 1;
            case CANCELLED, REFUNDED -> -2;
            default -> -1;
        };
        Map<String, Object> res = new HashMap<>();
        res.put("create_time", epochMs(order));
        res.put("perform_time", order.getPaidAt() != null
                ? order.getPaidAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : 0);
        res.put("cancel_time", 0);
        res.put("transaction", order.getOrderNo());
        res.put("state", state);
        res.put("reason", null);
        return rpcResult(id, res);
    }

    // --- helpers ---

    private boolean authorized(String auth) {
        if (auth == null || !auth.startsWith("Basic ")) return false;
        try {
            String decoded = new String(Base64.getDecoder().decode(auth.substring(6)), StandardCharsets.UTF_8);
            int idx = decoded.indexOf(':');
            String key = idx >= 0 ? decoded.substring(idx + 1) : "";
            return !props.getPayme().getKey().isBlank() && props.getPayme().getKey().equals(key);
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
