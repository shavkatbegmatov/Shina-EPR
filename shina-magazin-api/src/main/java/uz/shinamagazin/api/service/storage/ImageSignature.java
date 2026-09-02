package uz.shinamagazin.api.service.storage;

import java.nio.charset.StandardCharsets;

/**
 * Rasm fayllarining boshlang'ich baytlari ("magic bytes") bo'yicha haqiqiy turini aniqlash.
 *
 * <p>Mijoz yuborgan {@code Content-Type} sarlavhasi va fayl nomi ikkalasi ham ishonchsiz:
 * ilgari kengaytma fayl nomidan olinardi, ya'ni {@code image/png} deb yuborilgan
 * {@code x.html} shu nom bilan saqlanib, {@code /api/uploads/...html} manzilidan HTML sifatida
 * xizmat qilinardi — asosiy domenda saqlanuvchi XSS. Endi tur va kengaytma faqat
 * baytlardan olinadi.
 */
final class ImageSignature {

    /** Aniqlash uchun yetarli bayt soni (AVIF brend 8–11 baytlarda). */
    static final int HEADER_LENGTH = 16;

    private ImageSignature() {
    }

    /**
     * @param head faylning birinchi baytlari (kamida {@link #HEADER_LENGTH} tavsiya etiladi)
     * @return aniqlangan MIME turi yoki qo'llab-quvvatlanadigan rasm bo'lmasa {@code null}
     */
    static String detect(byte[] head) {
        if (head == null) {
            return null;
        }
        if (startsWith(head, 0, 0xFF, 0xD8, 0xFF)) {
            return "image/jpeg";
        }
        if (startsWith(head, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return "image/png";
        }
        if (ascii(head, 0, "GIF87a") || ascii(head, 0, "GIF89a")) {
            return "image/gif";
        }
        if (ascii(head, 0, "RIFF") && ascii(head, 8, "WEBP")) {
            return "image/webp";
        }
        if (ascii(head, 4, "ftyp") && (ascii(head, 8, "avif") || ascii(head, 8, "avis"))) {
            return "image/avif";
        }
        return null;
    }

    /** Aniqlangan MIME turiga mos kengaytma (nuqta bilan). */
    static String extensionFor(String mime) {
        return switch (mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            case "image/avif" -> ".avif";
            default -> throw new IllegalArgumentException("Noma'lum rasm turi: " + mime);
        };
    }

    private static boolean startsWith(byte[] data, int offset, int... expected) {
        if (data.length < offset + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((data[offset + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean ascii(byte[] data, int offset, String expected) {
        byte[] bytes = expected.getBytes(StandardCharsets.US_ASCII);
        if (data.length < offset + bytes.length) {
            return false;
        }
        for (int i = 0; i < bytes.length; i++) {
            if (data[offset + i] != bytes[i]) {
                return false;
            }
        }
        return true;
    }
}
