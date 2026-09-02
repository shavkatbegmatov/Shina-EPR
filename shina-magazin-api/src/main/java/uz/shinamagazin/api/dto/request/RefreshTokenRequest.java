package uz.shinamagazin.api.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.exception.BadRequestException;

/**
 * Refresh token so'rovi — token JSON body'da.
 *
 * <p>Ilgari token URL query parametri sifatida kelardi. Query string Traefik/nginx
 * access-loglariga, brauzer tarixiga va oraliq proksilarga tushadi — 7 kunlik
 * kredensial uchun bu joy emas.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenRequest {

    private String refreshToken;

    /**
     * Body'dagi token ustuvor; URL parametri faqat eski (brauzerda keshlangan) frontend
     * uchun VAQTINCHA qabul qilinadi. Ikkalasi ham bo'sh bo'lsa — 400.
     */
    public static String resolve(RefreshTokenRequest body, String queryParam) {
        if (body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()) {
            return body.getRefreshToken();
        }
        if (queryParam != null && !queryParam.isBlank()) {
            return queryParam;
        }
        throw new BadRequestException("refreshToken talab qilinadi");
    }
}
