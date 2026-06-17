package uz.shinamagazin.api.dto.response;

import lombok.Builder;
import lombok.Data;

/** To'lov boshlash javobi: onlayn usul uchun checkout URL, naqd uchun null. */
@Data
@Builder
public class PaymentInitResponse {
    private String orderNo;
    private String method;
    /** Provayder checkout sahifasi URL'i (PAYME/CLICK/CARD yoqilgan bo'lsa); naqd/o'chiq uchun null */
    private String redirectUrl;
    private String paymentStatus;
    /** true = mijoz provayder sahifasiga yo'naltirilishi kerak */
    private boolean online;
}
