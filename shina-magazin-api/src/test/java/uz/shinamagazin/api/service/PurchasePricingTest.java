package uz.shinamagazin.api.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.shinamagazin.api.enums.PurchaseCurrency;
import uz.shinamagazin.api.exception.BadRequestException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Kirim hujjati arifmetikasi — ta'minotchi yuk xatidagi raqamlar bilan.
 *
 * <p>Namuna: "LARGO TYRES GROUP" hujjati — 8 × 40 $ va 8 × 48,5 $, har
 * donaga 1 $ bonus: Jami summa 708, Bonus 16, To'lov summa 692.
 */
class PurchasePricingTest {

    private static final BigDecimal RATE = new BigDecimal("12700");

    @Test
    @DisplayName("USD hujjat: so'mga qator darajasida aylantiriladi, bonus to'lov summasini kamaytiradi")
    void usdInvoiceIsConvertedPerLine() {
        PurchasePricing.Totals totals = PurchasePricing.compute(PurchaseCurrency.USD, RATE,
                new BigDecimal("254000"), List.of(
                        line(1, 8, "40", "1", "0"),
                        line(2, 8, "48.5", "1", "0")));

        assertThat(totals.totalQuantity()).isEqualTo(16);
        // Hujjat valyutasida: 320 + 388 − 16
        assertThat(totals.foreignTotalAmount()).isEqualByComparingTo("692");
        // So'mda: 4 064 000 + 4 927 600 = 8 991 600; bonus 16 × 12 700
        assertThat(totals.goodsAmount()).isEqualByComparingTo("8991600");
        assertThat(totals.bonusAmount()).isEqualByComparingTo("203200");
        assertThat(totals.totalAmount()).isEqualByComparingTo("8788400");

        PurchasePricing.Line first = totals.lines().get(0);
        assertThat(first.foreignUnitPrice()).isEqualByComparingTo("40");
        assertThat(first.unitPrice()).isEqualByComparingTo("508000");
        assertThat(first.bonusPerUnit()).isEqualByComparingTo("12700");
        assertThat(first.bonusAmount()).isEqualByComparingTo("101600");
        // Yo'l haqi miqdorga mutanosib: 254 000 × 8 / 16 = 127 000
        assertThat(first.transportShare()).isEqualByComparingTo("127000");
        // Tannarx: (4 064 000 − 101 600 + 127 000) / 8
        assertThat(first.landedUnitCost()).isEqualByComparingTo("511175");
        assertThat(totals.lines().get(1).landedUnitCost()).isEqualByComparingTo("619125");
    }

    @Test
    @DisplayName("UZS hujjatda kurs e'tiborga olinmaydi va valyuta summasi yo'q")
    void uzsInvoiceIgnoresRate() {
        PurchasePricing.Totals totals = PurchasePricing.compute(PurchaseCurrency.UZS,
                new BigDecimal("99999"), BigDecimal.ZERO,
                List.of(line(1, 10, "100000", "0", "0")));

        assertThat(totals.totalAmount()).isEqualByComparingTo("1000000");
        assertThat(totals.foreignTotalAmount()).isNull();
        assertThat(totals.lines().get(0).foreignUnitPrice()).isNull();
        assertThat(totals.lines().get(0).landedUnitCost()).isEqualByComparingTo("100000");
    }

    @Test
    @DisplayName("Foizli bonus qator summasidan hisoblanadi")
    void percentBonus() {
        PurchasePricing.Totals totals = PurchasePricing.compute(PurchaseCurrency.UZS, BigDecimal.ONE,
                BigDecimal.ZERO, List.of(line(1, 10, "100000", "0", "10")));

        assertThat(totals.lines().get(0).bonusAmount()).isEqualByComparingTo("100000");
        assertThat(totals.totalAmount()).isEqualByComparingTo("900000");
    }

    // Yo'l haqi ulushlari yaxlitlanganda yig'indi yo'l haqidan farq qilmasligi
    // kerak — aks holda bir necha tiyin "yo'qolib", tannarx yig'indisi
    // xarajatga teng bo'lmasdi.
    @Test
    @DisplayName("Yo'l haqi ulushlari yig'indisi yo'l haqiga teng (qoldiq oxirgi qatorga)")
    void transportSharesSumExactly() {
        PurchasePricing.Totals totals = PurchasePricing.compute(PurchaseCurrency.UZS, BigDecimal.ONE,
                new BigDecimal("100"), List.of(
                        line(1, 1, "1000", "0", "0"),
                        line(2, 1, "1000", "0", "0"),
                        line(3, 1, "1000", "0", "0")));

        assertThat(totals.lines().get(0).transportShare()).isEqualByComparingTo("33.33");
        assertThat(totals.lines().get(1).transportShare()).isEqualByComparingTo("33.33");
        assertThat(totals.lines().get(2).transportShare()).isEqualByComparingTo("33.34");
    }

    @Test
    @DisplayName("Bonus qator summasidan katta bo'lsa rad etiladi")
    void bonusAboveLineTotalRejected() {
        assertThatThrownBy(() -> PurchasePricing.compute(PurchaseCurrency.UZS, BigDecimal.ONE,
                BigDecimal.ZERO, List.of(line(1, 1, "1000", "2000", "0"))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bonus");
    }

    private static PurchasePricing.LineInput line(long key, int qty, String price,
                                                  String bonusPerUnit, String bonusPercent) {
        return new PurchasePricing.LineInput(key, qty, new BigDecimal(price),
                new BigDecimal(bonusPerUnit), new BigDecimal(bonusPercent));
    }
}
