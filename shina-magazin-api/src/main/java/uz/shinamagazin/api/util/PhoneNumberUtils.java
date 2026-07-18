package uz.shinamagazin.api.util;

import java.util.regex.Pattern;

/** Telefon raqamlarini bazada va qidiruvlarda bitta kanonik formatga keltiradi. */
public final class PhoneNumberUtils {

    private static final Pattern NON_DIGITS = Pattern.compile("\\D");

    private PhoneNumberUtils() {
    }

    /**
     * O'zbekiston raqamlarini {@code +998XXXXXXXXX} formatiga keltiradi.
     * Boshqa xalqaro raqamlar uchun faqat {@code +} va raqamlar saqlanadi.
     */
    public static String normalize(String phone) {
        if (phone == null || phone.isBlank()) {
            return phone;
        }

        String digits = NON_DIGITS.matcher(phone).replaceAll("");
        if (digits.length() == 9) {
            return "+998" + digits;
        }
        if (digits.length() == 10 && digits.startsWith("0")) {
            return "+998" + digits.substring(1);
        }
        return "+" + digits;
    }
}
