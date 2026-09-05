package uz.shinamagazin.api.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.*;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private SecretKey key;

    /** HS256 uchun minimal kalit uzunligi (RFC 7518: kalit hash chiqishidan kichik bo'lmasin). */
    private static final int MIN_KEY_BYTES = 32;
    private static final java.util.regex.Pattern WHITESPACE = java.util.regex.Pattern.compile("\\s+");

    /**
     * Repo tarixida ochiq qolgan, shuning uchun ISHONCHSIZ deb hisoblanadigan kalitlar.
     * Bular ilgari application.yml'da default sifatida turgan — ya'ni ular bilan
     * imzolangan tokenni istalgan odam soxtalashtira oladi. Qayta ishlatilmasin.
     */
    private static final Set<String> COMPROMISED_SECRETS = Set.of(
            "mS1mNCtIuahtLE4Q/OW/eQc/11mONeSU5T1dcGnwX0M="
    );

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET o'rnatilmagan. Generatsiya: openssl rand -base64 32");
        }
        // Bo'shliq va satr belgilaridan tozalaymiz. `openssl rand -base64 64` natijani
        // 64 ustunda BO'LIB chiqaradi; env maydoniga nusxalanganda ichida satr belgisi
        // qoladi. jjwt dekoderi (0.12.6 ham, 0.13.0 ham — 06.09.2026 da ikkalasi
        // image sifatida tekshirildi) ICHKI satr belgisini "Illegal base64 character"
        // bilan rad etadi, oxiridagi CR/LF ni esa o'tkazadi. Kalit MAZMUNI uchun
        // bo'shliqning ma'nosi yo'q, shuning uchun uni olib tashlash xavfsiz;
        // qisqa yoki noto'g'ri kalit baribir quyida rad etiladi.
        String secret = WHITESPACE.matcher(jwtSecret).replaceAll("");

        if (COMPROMISED_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "JWT_SECRET repo tarixida ochiq qolgan eski default kalitga teng — "
                            + "u bilan token soxtalashtirish mumkin. Yangi kalit generatsiya qiling: "
                            + "openssl rand -base64 32");
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException e) {
            // jjwt DecodingException'i IllegalArgumentException'dan meros olmaydi
            throw new IllegalStateException(
                    "JWT_SECRET to'g'ri base64 emas. Generatsiya: openssl rand -base64 32", e);
        }
        if (keyBytes.length < MIN_KEY_BYTES) {
            throw new IllegalStateException(String.format(
                    "JWT_SECRET juda qisqa (%d bayt), kamida %d bayt kerak. "
                            + "Generatsiya: openssl rand -base64 32", keyBytes.length, MIN_KEY_BYTES));
        }

        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        if (userDetails instanceof CustomUserDetails) {
            CustomUserDetails customUserDetails = (CustomUserDetails) userDetails;
            return generateStaffTokenWithPermissions(
                    customUserDetails.getUsername(),
                    customUserDetails.getId(),
                    customUserDetails.getRoleCodes(),
                    customUserDetails.getPermissions()
            );
        }
        return generateToken(userDetails.getUsername());
    }

    public String generateToken(String username) {
        return generateToken(username, "STAFF");
    }

    public String generateToken(String username, String tokenType) {
        return generateToken(username, tokenType, null);
    }

    public String generateToken(String username, String tokenType, Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        var builder = Jwts.builder()
                .subject(username)
                .claim("type", tokenType)
                .issuedAt(now)
                .expiration(expiryDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        return builder.signWith(key).compact();
    }

    /**
     * Generate token with permissions for staff users
     */
    public String generateStaffTokenWithPermissions(String username, Long userId, Set<String> roles, Set<String> permissions) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        var builder = Jwts.builder()
                .subject(username)
                .claim("type", "STAFF")
                .claim("userId", userId)
                .claim("roles", new ArrayList<>(roles))
                .claim("permissions", new ArrayList<>(permissions))
                .issuedAt(now)
                .expiration(expiryDate);

        return builder.signWith(key).compact();
    }

    public String generateRefreshToken(String username) {
        return generateRefreshToken(username, "STAFF");
    }

    public String generateRefreshToken(String username, String tokenType) {
        return generateRefreshToken(username, tokenType, null);
    }

    public String generateRefreshToken(String username, String tokenType, Long userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        var builder = Jwts.builder()
                .subject(username)
                .claim("type", tokenType)
                // Refresh va access tokenlar ilgari strukturaviy BIR XIL edi —
                // refresh endpoint istalgan imzolangan JWT'ni (access token,
                // mijoz tokeni) qabul qilar, filtr esa refresh tokenni access
                // sifatida ajrata olmasdi. Bu claim ularni farqlaydi.
                .claim("refresh", true)
                .issuedAt(now)
                .expiration(expiryDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        return builder.signWith(key).compact();
    }

    /**
     * Haqiqiy refresh tokenmi ({@code refresh: true} claim bilan chiqarilgan).
     *
     * <p>Eski (claim'siz) tokenlar uchun {@code false} — bu ataylab qilingan:
     * staff refresh oqimi bu o'zgarishgacha umuman ishlamagan (sessiyasiz
     * token har doim rad etilardi), ya'ni eski refresh tokenlarni rad etish
     * hech kimning ishlayotgan oqimini buzmaydi.
     */
    public boolean isRefreshToken(String token) {
        Claims claims = getClaims(token);
        return Boolean.TRUE.equals(claims.get("refresh", Boolean.class));
    }

    // Customer portal uchun token generatsiya
    public String generateCustomerToken(String phone, Long customerId) {
        return generateToken(phone, "CUSTOMER", customerId);
    }

    public String generateCustomerRefreshToken(String phone, Long customerId) {
        return generateRefreshToken(phone, "CUSTOMER", customerId);
    }

    // Staff uchun token generatsiya (userId bilan)
    public String generateStaffToken(String username, Long userId) {
        return generateToken(username, "STAFF", userId);
    }

    public String generateStaffRefreshToken(String username, Long userId) {
        return generateRefreshToken(username, "STAFF", userId);
    }

    public String getUsernameFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = getClaims(token);
        return claims.get("userId", Long.class);
    }

    public String getTokenType(String token) {
        Claims claims = getClaims(token);
        String type = claims.get("type", String.class);
        return type != null ? type : "STAFF"; // Default STAFF for old tokens
    }

    public boolean isCustomerToken(String token) {
        return "CUSTOMER".equals(getTokenType(token));
    }

    @SuppressWarnings("unchecked")
    public Set<String> getRolesFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> roles = claims.get("roles", List.class);
        return roles != null ? new HashSet<>(roles) : new HashSet<>();
    }

    @SuppressWarnings("unchecked")
    public Set<String> getPermissionsFromToken(String token) {
        Claims claims = getClaims(token);
        List<String> permissions = claims.get("permissions", List.class);
        return permissions != null ? new HashSet<>(permissions) : new HashSet<>();
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token");
        } catch (ExpiredJwtException ex) {
            log.error("Expired JWT token");
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token");
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty");
        }
        return false;
    }
}
