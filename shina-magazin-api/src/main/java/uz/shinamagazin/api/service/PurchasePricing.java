package uz.shinamagazin.api.service;

import uz.shinamagazin.api.enums.PurchaseCurrency;
import uz.shinamagazin.api.exception.BadRequestException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Kirim hujjati arifmetikasi — sof funksiya, DB'siz sinaladi.
 *
 * <p>Ta'minotchi yuk xati shabloni:
 * <pre>
 *   Mahsulot | Soni | Narx | Jami | Bonus $ | Bonus % | Bonus summa
 *   Jami: 140            To'lov summa: 5 296  (= Jami summa − Bonus)
 * </pre>
 * Narxlar hujjat valyutasida (ko'pincha USD). Bu yerda ular so'mga
 * aylantiriladi, bonus hisoblanadi, yo'l haqi tannarxga taqsimlanadi.
 *
 * <p>Yaxlitlash QATOR darajasida (har qator alohida so'mga aylantiriladi),
 * shuning uchun so'mdagi jami hujjat valyutasidagi jami × kursdan bir-ikki
 * tiyinga farq qilishi mumkin — bu buxgalteriyada odatiy va kutilgan holat.
 */
final class PurchasePricing {

    private static final int MONEY_SCALE = 2;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private PurchasePricing() {
    }

    /** Bitta hujjat qatori — kiritilgan (hujjat valyutasida). */
    record LineInput(
            Object key,
            int quantity,
            BigDecimal unitPriceDoc,
            BigDecimal bonusPerUnitDoc,
            BigDecimal bonusPercent) {
    }

    /** Hisoblangan qator — hammasi so'mda, {@code foreign*} esa hujjat valyutasida. */
    record Line(
            Object key,
            int quantity,
            BigDecimal foreignUnitPrice,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            BigDecimal bonusPerUnit,
            BigDecimal bonusPercent,
            BigDecimal bonusAmount,
            BigDecimal transportShare,
            BigDecimal landedUnitCost,
            BigDecimal foreignLineTotal,
            BigDecimal foreignBonus) {
    }

    record Totals(
            List<Line> lines,
            int totalQuantity,
            BigDecimal goodsAmount,
            BigDecimal bonusAmount,
            BigDecimal totalAmount,
            BigDecimal foreignTotalAmount) {
    }

    /**
     * @param currency      hujjat valyutasi
     * @param rate          1 birlik valyuta = N so'm (UZS uchun e'tiborga olinmaydi)
     * @param transportCost yo'l haqi, so'm — miqdorga mutanosib taqsimlanadi
     */
    static Totals compute(PurchaseCurrency currency, BigDecimal rate,
                          BigDecimal transportCost, List<LineInput> inputs) {
        boolean foreign = currency != null && currency != PurchaseCurrency.UZS;
        BigDecimal fx = foreign ? rate : BigDecimal.ONE;
        BigDecimal transport = nz(transportCost);

        int totalQuantity = inputs.stream().mapToInt(LineInput::quantity).sum();

        List<Line> lines = new ArrayList<>(inputs.size());
        BigDecimal goods = BigDecimal.ZERO;
        BigDecimal bonusTotal = BigDecimal.ZERO;
        BigDecimal foreignGoods = BigDecimal.ZERO;
        BigDecimal foreignBonusTotal = BigDecimal.ZERO;
        BigDecimal transportAllocated = BigDecimal.ZERO;

        for (int i = 0; i < inputs.size(); i++) {
            LineInput in = inputs.get(i);
            BigDecimal qty = BigDecimal.valueOf(in.quantity());
            BigDecimal priceDoc = nz(in.unitPriceDoc());
            BigDecimal bonusUnitDoc = nz(in.bonusPerUnitDoc());
            BigDecimal bonusPct = nz(in.bonusPercent());

            BigDecimal unitPrice = money(priceDoc.multiply(fx));
            BigDecimal totalPrice = money(unitPrice.multiply(qty));
            BigDecimal bonusPerUnit = money(bonusUnitDoc.multiply(fx));

            BigDecimal bonusAmount;
            BigDecimal foreignLineTotal = money(priceDoc.multiply(qty));
            BigDecimal foreignBonus;
            if (bonusPct.signum() > 0) {
                bonusAmount = money(totalPrice.multiply(bonusPct).divide(HUNDRED, 6, RoundingMode.HALF_UP));
                foreignBonus = money(foreignLineTotal.multiply(bonusPct).divide(HUNDRED, 6, RoundingMode.HALF_UP));
            } else {
                bonusAmount = money(bonusPerUnit.multiply(qty));
                foreignBonus = money(bonusUnitDoc.multiply(qty));
            }
            if (bonusAmount.compareTo(totalPrice) > 0) {
                throw new BadRequestException(
                        "Qator bonusi qator summasidan katta bo'lishi mumkin emas");
            }

            // Yo'l haqi ulushi: oxirgi qator qoldiqni oladi — yaxlitlash
            // farqi tufayli ulushlar yig'indisi yo'l haqidan farq qilmasin.
            BigDecimal share;
            if (totalQuantity == 0 || in.quantity() == 0) {
                share = BigDecimal.ZERO;
            } else if (i == inputs.size() - 1) {
                share = transport.subtract(transportAllocated);
            } else {
                share = money(transport.multiply(qty)
                        .divide(BigDecimal.valueOf(totalQuantity), 6, RoundingMode.HALF_UP));
            }
            transportAllocated = transportAllocated.add(share);

            BigDecimal landed = in.quantity() == 0 ? null
                    : totalPrice.subtract(bonusAmount).add(share)
                            .divide(qty, MONEY_SCALE, RoundingMode.HALF_UP);

            lines.add(new Line(in.key(), in.quantity(),
                    foreign ? priceDoc.setScale(4, RoundingMode.HALF_UP) : null,
                    unitPrice, totalPrice, bonusPerUnit,
                    bonusPct.setScale(2, RoundingMode.HALF_UP), bonusAmount,
                    share, landed, foreignLineTotal, foreignBonus));

            goods = goods.add(totalPrice);
            bonusTotal = bonusTotal.add(bonusAmount);
            foreignGoods = foreignGoods.add(foreignLineTotal);
            foreignBonusTotal = foreignBonusTotal.add(foreignBonus);
        }

        return new Totals(lines, totalQuantity, goods, bonusTotal,
                goods.subtract(bonusTotal),
                foreign ? foreignGoods.subtract(foreignBonusTotal) : null);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
