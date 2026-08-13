package uz.shinamagazin.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Refresh va access tokenlarni farqlash.
 *
 * <p>Ilgari ular strukturaviy BIR XIL edi ({@code type: STAFF}, faqat muddati
 * boshqa) — refresh endpoint istalgan imzolangan JWT'ni qabul qilar, mijoz
 * refresh tokeni esa 7 kunlik access token vazifasini bajara olardi.
 * {@code refresh: true} claim shu ikkala teshikni yopadi.
 */
class JwtRefreshTokenClaimTest {

    private static final String SECRET = "JyhYCX/C4dqsliMYHB635TPrujj0WEY+IglVoEWmwvA=";

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(provider, "jwtExpiration", 86_400_000L);
        ReflectionTestUtils.setField(provider, "refreshExpiration", 604_800_000L);
        provider.init();
    }

    @Test
    @DisplayName("Staff refresh tokeni refresh deb tanilady, access esa yo'q")
    void staffTokensAreDistinguishable() {
        String refresh = provider.generateStaffRefreshToken("kassir", 1L);
        String access = provider.generateStaffTokenWithPermissions(
                "kassir", 1L, Set.of("SELLER"), Set.of("SALES_CREATE"));

        assertThat(provider.isRefreshToken(refresh)).isTrue();
        assertThat(provider.isRefreshToken(access)).isFalse();
        assertThat(provider.getTokenType(refresh)).isEqualTo("STAFF");
    }

    @Test
    @DisplayName("Mijoz refresh tokeni ham refresh deb tanilady")
    void customerRefreshTokenCarriesClaim() {
        String refresh = provider.generateCustomerRefreshToken("+998901234567", 5L);
        String access = provider.generateCustomerToken("+998901234567", 5L);

        assertThat(provider.isRefreshToken(refresh)).isTrue();
        assertThat(provider.isCustomerToken(refresh)).isTrue();
        assertThat(provider.isRefreshToken(access)).isFalse();
    }

    @Test
    @DisplayName("Oddiy staff access tokeni refresh emas")
    void plainStaffTokenIsNotRefresh() {
        assertThat(provider.isRefreshToken(provider.generateStaffToken("kassir", 1L))).isFalse();
    }
}
