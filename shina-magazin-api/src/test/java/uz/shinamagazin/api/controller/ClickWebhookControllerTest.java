package uz.shinamagazin.api.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import uz.shinamagazin.api.config.PaymentProperties;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopPaymentStatus;
import uz.shinamagazin.api.service.ShopPaymentService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Click webhook'ining fail-closed xatti-harakatini qulflaydi.
 *
 * Tarixiy zaiflik: `complete` da `click.enabled` tekshirilmasdi va `secretKey`
 * defaulti bo'sh satr edi. Bo'sh kalitda imzo satri faqat ommaviy maydonlardan
 * iborat bo'lib qolardi — ya'ni istalgan odam to'g'ri MD5 hisoblab, buyurtmani
 * to'lamasdan PAID qila olardi. `rejectsWhenSecretKeyBlank` aynan shuni qo'riqlaydi.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClickWebhookControllerTest {

    private static final String SECRET = "click-maxfiy-kalit";
    private static final String SERVICE_ID = "12345";
    private static final String ORDER_NO = "PR-ABC123";
    private static final String TX_ID = "987654";
    private static final String AMOUNT = "150000";

    @Mock private ShopPaymentService paymentService;

    private PaymentProperties props;
    private ClickWebhookController controller;

    @BeforeEach
    void setUp() {
        props = new PaymentProperties();
        props.getClick().setEnabled(true);
        props.getClick().setServiceId(SERVICE_ID);
        props.getClick().setSecretKey(SECRET);
        controller = new ClickWebhookController(paymentService, props);
    }

    @Test
    void rejectsWhenIntegrationDisabled() {
        props.getClick().setEnabled(false);
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, Object> res = controller.complete(completeParams(SECRET));

        assertEquals(-1, res.get("error"), "o'chiq integratsiya rad etilishi kerak");
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void rejectsWhenSecretKeyBlank() {
        // Hujumchi bo'sh kalit bilan imzoni o'zi hisoblab yuboradi.
        props.getClick().setSecretKey("");
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, Object> res = controller.complete(completeParams(""));

        assertEquals(-1, res.get("error"), "bo'sh secretKey bilan imzo qabul qilinmasligi kerak");
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void rejectsInvalidSignature() {
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, String> p = completeParams(SECRET);
        p.put("sign_string", "00000000000000000000000000000000");

        assertEquals(-1, controller.complete(p).get("error"));
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void rejectsWrongAmountOnComplete() {
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, String> p = completeParams(SECRET, "1");   // 150 000 o'rniga 1 so'm
        Map<String, Object> res = controller.complete(p);

        assertEquals(-2, res.get("error"), "summa mos kelmasa to'lov qabul qilinmasligi kerak");
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void marksPaidOnValidComplete() {
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, Object> res = controller.complete(completeParams(SECRET));

        assertEquals(0, res.get("error"));
        verify(paymentService).markPaid(ORDER_NO, TX_ID);
    }

    @Test
    void repeatedCompleteWithSameTransactionIsIdempotent() {
        givenOrder(ShopPaymentStatus.PAID, TX_ID);

        Map<String, Object> res = controller.complete(completeParams(SECRET));

        assertEquals(0, res.get("error"), "Click qayta urinishi muvaffaqiyat qaytarishi kerak");
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void rejectsCompleteWhenAlreadyPaidByAnotherTransaction() {
        givenOrder(ShopPaymentStatus.PAID, "boshqa-tranzaksiya");

        Map<String, Object> res = controller.complete(completeParams(SECRET));

        assertEquals(-4, res.get("error"));
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void cancellationIsRecordedWithoutAmountCheck() {
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, String> p = completeParams(SECRET);
        p.put("error", "-5017");
        p.put("sign_string", sign(SECRET, p));

        controller.complete(p);

        verify(paymentService).markFailed(ORDER_NO);
        verify(paymentService, never()).markPaid(anyString(), any());
    }

    @Test
    void prepareRejectsWhenIntegrationDisabled() {
        props.getClick().setEnabled(false);
        givenOrder(ShopPaymentStatus.PENDING, null);

        Map<String, String> p = prepareParams();
        p.put("sign_string", signPrepare(SECRET, p));

        assertEquals(-1, controller.prepare(p).get("error"));
    }

    // --- helpers ---

    private void givenOrder(ShopPaymentStatus status, String providerTxId) {
        ShopOrder order = ShopOrder.builder()
                .orderNo(ORDER_NO)
                .totalAmount(new BigDecimal(AMOUNT))
                .paymentStatus(status)
                .providerTransactionId(providerTxId)
                .build();
        when(paymentService.getOrder(ORDER_NO)).thenReturn(order);
    }

    private Map<String, String> completeParams(String signingSecret) {
        return completeParams(signingSecret, AMOUNT);
    }

    private Map<String, String> completeParams(String signingSecret, String amount) {
        Map<String, String> p = new HashMap<>();
        p.put("click_trans_id", TX_ID);
        p.put("service_id", SERVICE_ID);
        p.put("merchant_trans_id", ORDER_NO);
        p.put("merchant_prepare_id", "1");
        p.put("amount", amount);
        p.put("action", "1");
        p.put("error", "0");
        p.put("sign_time", "2026-07-25 12:00:00");
        p.put("sign_string", sign(signingSecret, p));
        return p;
    }

    private Map<String, String> prepareParams() {
        Map<String, String> p = new HashMap<>();
        p.put("click_trans_id", TX_ID);
        p.put("service_id", SERVICE_ID);
        p.put("merchant_trans_id", ORDER_NO);
        p.put("amount", AMOUNT);
        p.put("action", "0");
        p.put("sign_time", "2026-07-25 12:00:00");
        return p;
    }

    /** Click `complete` imzo formulasi. */
    private static String sign(String secret, Map<String, String> p) {
        return md5(p.get("click_trans_id") + p.get("service_id") + secret
                + p.get("merchant_trans_id") + p.get("merchant_prepare_id") + p.get("amount")
                + p.get("action") + p.get("sign_time"));
    }

    /** Click `prepare` imzo formulasi (merchant_prepare_id yo'q). */
    private static String signPrepare(String secret, Map<String, String> p) {
        return md5(p.get("click_trans_id") + p.get("service_id") + secret
                + p.get("merchant_trans_id") + p.get("amount") + p.get("action") + p.get("sign_time"));
    }

    private static String md5(String s) {
        try {
            byte[] digest = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
