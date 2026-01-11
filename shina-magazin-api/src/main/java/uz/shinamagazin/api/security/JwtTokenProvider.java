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
import java.util.Date;

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

    @PostConstruct
    public void init() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
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
                .issuedAt(now)
                .expiration(expiryDate);

        if (userId != null) {
            builder.claim("userId", userId);
        }

        return builder.signWith(key).compact();
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
