package uz.shinamagazin.api.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Mijoz IP manzilini aniqlash — audit va rate limit uchun yagona manba.
 *
 * <p>Ilgari bu mantiq uch joyda takrorlangan edi (AuthController,
 * ShopOrderController, AuditEntityListener) va ular BIR XIL emas edi: biri
 * `X-Real-IP` ni ham tekshirardi, ikkinchisi yo'q.
 *
 * <h3>Nega eng O'NGDAGI qiymat</h3>
 *
 * <p>{@code X-Forwarded-For} — bu proksилar ketma-ket QO'SHIB boradigan ro'yxat:
 * <pre>
 *   X-Forwarded-For: &lt;mijoz aytgan&gt;, &lt;proksi ko'rgan haqiqiy manzil&gt;
 * </pre>
 * Chapdagi qiymatlarni MIJOZ yuborishi mumkin. Agar chapdan olsak, hujumchi
 * har so'rovda soxta IP yuborib rate limitni butunlay chetlab o'tardi —
 * har urinish "yangi IP" bo'lib ko'rinardi.
 *
 * <p>Eng o'ngdagi qiymatni bizning o'z proksimiz (Traefik) qo'shadi, ya'ni uni
 * mijoz nazorat qila olmaydi. Shuning uchun throttling uchun aynan shu ishonchli.
 *
 * <p><b>Diqqat:</b> bu bitta ishonchli teskari proksi ortidagi joylashuv uchun
 * to'g'ri (joriy deployment: Traefik). Proksilar soni o'zgarsa yoki backend
 * to'g'ridan-to'g'ri internetga chiqarilsa, bu qoida qayta ko'rib chiqilishi kerak.
 */
public final class ClientIp {

    private ClientIp() {
        // Utility class
    }

    public static String of(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String hop = hops[i].trim();
                if (!hop.isEmpty()) return hop;
            }
        }

        // Ba'zi proksilar faqat shuni qo'yadi; u bitta qiymat, ro'yxat emas.
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
