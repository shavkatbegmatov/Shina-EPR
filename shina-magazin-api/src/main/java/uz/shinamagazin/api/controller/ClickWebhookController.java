package uz.shinamagazin.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.config.PaymentProperties;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.service.ShopPaymentService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

/**
 * Click Shop API webhook (Prepare + Complete). Click ushbu endpointlarni
 * to'lov jarayonida chaqiradi. Imzo (MD5) secretKey bilan tekshiriladi.
 *
 * ⚠️ Foydalanuvchi Click merchant kabinetida bu URL'larni ro'yxatdan o'tkazishi
 * va sandbox'da tasdiqlashi shart. SecurityConfig'da permitAll.
 * merchant_trans_id = buyurtma orderNo.
 */
@RestController
@RequestMapping("/v1/payments/click")
@RequiredArgsConstructor
@Slf4j
public class ClickWebhookController {

    private final ShopPaymentService paymentService;
    private final PaymentProperties props;

    private static final int OK = 0;
    private static final int ERR_SIGN = -1;
    private static final int ERR_AMOUNT = -2;
    private static final int ERR_ORDER_NOT_FOUND = -5;
    private static final int ERR_ALREADY_PAID = -4;

    @PostMapping(value = "/prepare", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public Map<String, Object> prepare(@RequestParam Map<String, String> p) {
        Map<String, Object> res = baseResponse(p);
        String signSrc = p.get("click_trans_id") + p.get("service_id") + props.getClick().getSecretKey()
                + p.get("merchant_trans_id") + p.get("amount") + p.get("action") + p.get("sign_time");
        if (!md5(signSrc).equalsIgnoreCase(p.getOrDefault("sign_string", ""))) {
            return error(res, ERR_SIGN, "Invalid sign");
        }
        ShopOrder order = findOrder(p.get("merchant_trans_id"));
        if (order == null) return error(res, ERR_ORDER_NOT_FOUND, "Order not found");
        if (!amountMatches(order, p.get("amount"))) return error(res, ERR_AMOUNT, "Incorrect amount");
        if (order.getPaymentStatus() == ShopPaymentStatus.PAID) return error(res, ERR_ALREADY_PAID, "Already paid");

        res.put("merchant_prepare_id", order.getId());
        return error(res, OK, "Success");
    }

    @PostMapping(value = "/complete", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public Map<String, Object> complete(@RequestParam Map<String, String> p) {
        Map<String, Object> res = baseResponse(p);
        String signSrc = p.get("click_trans_id") + p.get("service_id") + props.getClick().getSecretKey()
                + p.get("merchant_trans_id") + p.get("merchant_prepare_id") + p.get("amount")
                + p.get("action") + p.get("sign_time");
        if (!md5(signSrc).equalsIgnoreCase(p.getOrDefault("sign_string", ""))) {
            return error(res, ERR_SIGN, "Invalid sign");
        }
        ShopOrder order = findOrder(p.get("merchant_trans_id"));
        if (order == null) return error(res, ERR_ORDER_NOT_FOUND, "Order not found");

        // error<0 yoki action!=1 -> bekor
        int clickError = parseInt(p.get("error"));
        if (clickError < 0 || !"1".equals(p.get("action"))) {
            paymentService.markFailed(order.getOrderNo());
            return error(res, clickError < 0 ? clickError : -9, "Cancelled");
        }
        paymentService.markPaid(order.getOrderNo(), p.get("click_trans_id"));
        res.put("merchant_confirm_id", order.getId());
        return error(res, OK, "Success");
    }

    private Map<String, Object> baseResponse(Map<String, String> p) {
        Map<String, Object> res = new HashMap<>();
        res.put("click_trans_id", parseLong(p.get("click_trans_id")));
        res.put("merchant_trans_id", p.get("merchant_trans_id"));
        return res;
    }

    private Map<String, Object> error(Map<String, Object> res, int code, String note) {
        res.put("error", code);
        res.put("error_note", note);
        return res;
    }

    private ShopOrder findOrder(String orderNo) {
        try { return paymentService.getOrder(orderNo); } catch (Exception e) { return null; }
    }

    private boolean amountMatches(ShopOrder order, String amount) {
        try { return order.getTotalAmount().compareTo(new BigDecimal(amount)) == 0; }
        catch (Exception e) { return false; }
    }

    private static int parseInt(String s) { try { return Integer.parseInt(s); } catch (Exception e) { return 0; } }
    private static long parseLong(String s) { try { return Long.parseLong(s); } catch (Exception e) { return 0; } }

    private static String md5(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("MD5 error", e);
        }
    }
}
