package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.dto.response.CatalogProductResponse;
import uz.shinamagazin.api.service.CatalogService;

/**
 * Storefront link-preview / SEO uchun server-tomon meta HTML (CRAWLER-ONLY).
 *
 * nginx link-preview bot User-Agent'ini `/mahsulot/{id}` dan shu endpointga
 * yo'naltiradi; oddiy foydalanuvchi SPA (index.html) ni oladi (tez, o'zgarishsiz).
 * Crawler faqat <head>dagi og/twitter meta'ni o'qiydi — shuning uchun body minimal.
 * og:image = mahsulotning haqiqiy rasmi (rasm yo'q bo'lsa umumiy og-cover).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Shop SEO", description = "Storefront link-preview meta (crawler)")
public class ShopSeoController {

    private final CatalogService catalogService;

    @GetMapping(value = "/v1/seo/products/{id}", produces = "text/html;charset=UTF-8")
    @Operation(summary = "Product link-preview meta (HTML)")
    public ResponseEntity<String> productMeta(@PathVariable Long id, HttpServletRequest req) {
        String base = siteBaseUrl(req);
        CatalogProductResponse p;
        try {
            p = catalogService.getCatalogProduct(id);
        } catch (RuntimeException ex) {
            return ResponseEntity.ok(page(
                    "Mahsulot topilmadi — Protektor",
                    "Bunday mahsulot mavjud emas yoki sotuvdan olingan.",
                    base + "/og-cover.jpg",
                    base + "/mahsulot/" + id));
        }

        String title = p.getName() + " — Protektor";
        String desc = buildDescription(p);
        String image = absoluteImage(p.getImageUrl(), base);
        String url = base + "/mahsulot/" + p.getId();
        return ResponseEntity.ok(page(title, desc, image, url));
    }

    /** description bo'lsa o'shani, aks holda brend · o'lcham · narx dan yasaydi. */
    private String buildDescription(CatalogProductResponse p) {
        if (p.getDescription() != null && !p.getDescription().isBlank()) {
            return p.getDescription().trim();
        }
        StringBuilder sb = new StringBuilder();
        appendPart(sb, p.getBrandName());
        appendPart(sb, p.getSizeString());
        if (p.getSellingPrice() != null) {
            appendPart(sb, String.format("%,.0f so'm", p.getSellingPrice().doubleValue()));
        }
        return sb.length() > 0 ? sb.toString() : "Protektor — shinalar onlayn do'koni.";
    }

    private void appendPart(StringBuilder sb, String part) {
        if (part == null || part.isBlank()) return;
        if (sb.length() > 0) sb.append(" · ");
        sb.append(part);
    }

    /** Reverse-proxy (nginx) orqasidagi asl domen: X-Forwarded-* yoki Host header. */
    private String siteBaseUrl(HttpServletRequest req) {
        String scheme = firstNonBlank(req.getHeader("X-Forwarded-Proto"), req.getScheme());
        String host = firstNonBlank(req.getHeader("X-Forwarded-Host"), req.getHeader("Host"), "localhost");
        return scheme + "://" + host;
    }

    /** imageUrl to'liq URL bo'lsa o'zi; nisbiy bo'lsa domen bilan; yo'q bo'lsa og-cover. */
    private String absoluteImage(String imageUrl, String base) {
        if (imageUrl == null || imageUrl.isBlank()) return base + "/og-cover.jpg";
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
        return base + (imageUrl.startsWith("/") ? "" : "/") + imageUrl;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String page(String title, String desc, String image, String url) {
        String t = esc(title);
        String d = esc(desc);
        String img = esc(image);
        String u = esc(url);
        return "<!doctype html><html lang=\"uz\"><head>"
                + "<meta charset=\"UTF-8\"/>"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>"
                + "<title>" + t + "</title>"
                + "<meta name=\"description\" content=\"" + d + "\"/>"
                + "<meta property=\"og:type\" content=\"product\"/>"
                + "<meta property=\"og:site_name\" content=\"Protektor\"/>"
                + "<meta property=\"og:title\" content=\"" + t + "\"/>"
                + "<meta property=\"og:description\" content=\"" + d + "\"/>"
                + "<meta property=\"og:image\" content=\"" + img + "\"/>"
                + "<meta property=\"og:url\" content=\"" + u + "\"/>"
                + "<meta property=\"og:locale\" content=\"uz\"/>"
                + "<meta name=\"twitter:card\" content=\"summary_large_image\"/>"
                + "<meta name=\"twitter:title\" content=\"" + t + "\"/>"
                + "<meta name=\"twitter:description\" content=\"" + d + "\"/>"
                + "<meta name=\"twitter:image\" content=\"" + img + "\"/>"
                + "<link rel=\"canonical\" href=\"" + u + "\"/>"
                + "</head><body><h1>" + t + "</h1><p>" + d + "</p>"
                + "<p><a href=\"" + u + "\">Protektor'da ko'rish</a></p></body></html>";
    }
}
