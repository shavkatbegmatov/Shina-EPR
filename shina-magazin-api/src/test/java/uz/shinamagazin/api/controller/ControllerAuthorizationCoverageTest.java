package uz.shinamagazin.api.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.shinamagazin.api.security.RequiresPermission;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Har bir xodim (ERP) endpointida avtorizatsiya tekshiruvi borligini kafolatlaydi.
 *
 * <p>Sabab: `DebtController` va `DashboardController` uzoq vaqt umuman
 * himoyasiz qolgan edi — `SecurityConfig` faqat `.anyRequest().authenticated()`
 * talab qiladi, shuning uchun annotatsiyasiz metodga ENG PAST huquqli xodim ham
 * (hatto mijoz portali tokeni ham) kira olardi. `POST /v1/debts/{id}/pay` moliyaviy
 * yozuv bo'lsa-da, hech qanday ruxsat so'ramasdi.
 *
 * <p>Bu test yangi endpoint qo'shilganda annotatsiya unutilsa darhol yiqiladi.
 * Ataylab ochiq qoldirilgan endpointlar quyida ROʻYXATGA olinadi — ya'ni ochiqlik
 * bilib turib qilingan qaror bo'ladi, e'tiborsizlik emas.
 */
class ControllerAuthorizationCoverageTest {

    private static final String CONTROLLER_PACKAGE = "uz.shinamagazin.api.controller";

    /**
     * Butunlay ochiq yoki principal'dan ID oladigan kontrollerlar.
     * Bularda ruxsat annotatsiyasi TALAB QILINMAYDI.
     */
    private static final Set<String> PUBLIC_OR_SELF_SCOPED_CONTROLLERS = Set.of(
            // Ommaviy (autentifikatsiyasiz)
            "AuthController",             // login/refresh/logout
            "CustomerAuthController",     // mijoz telefon+PIN kirishi
            "CatalogController",          // vitrina katalogi
            "ShopSeoController",          // krauler uchun meta
            "ShopPaymentController",      // buyurtma to'lovini boshlash
            // Provayder imzosi bilan himoyalangan webhook'lar
            "ClickWebhookController",
            "PaymeWebhookController",
            // ID so'rovdan emas, @AuthenticationPrincipal'dan olinadi
            "CustomerPortalController",
            "AccountOrderController",
            "SessionController"
    );

    /**
     * Yuqoridagi ro'yxatga kirmaydigan kontrollerlardagi alohida ochiq metodlar.
     * Format: "ControllerNomi#metodNomi".
     */
    private static final Set<String> ALLOWED_UNGUARDED_METHODS = Set.of(
            "ShopOrderController#createOrder",       // vitrinadan mehmon buyurtmasi
            "ShopOrderController#getOrderStatus",    // buyurtma holati (ommaviy poll)
            "SettingsController#getPublicSettings",  // vitrina uchun ommaviy sozlamalar
            "LoginActivityController#getMyLoginHistory", // o'z tarixini ko'rish

            // ⚠️ MA'LUM BO'SHLIQ — bu yerda ruxsat emas, EGALIK tekshiruvi kerak.
            // Hozir istalgan autentifikatsiyalangan foydalanuvchi boshqa xodimning
            // bildirishnomasini id bo'yicha o'qilgan deb belgilashi yoki o'chirishi mumkin
            // (StaffNotificationService faqat mavjudlikni tekshiradi, userId bo'yicha
            // filtrlamaydi). Tuzatish: service/repository qatlamiga userId scoping.
            "StaffNotificationController#getNotifications",
            "StaffNotificationController#getUnreadNotifications",
            "StaffNotificationController#getUnreadCount",
            "StaffNotificationController#markAsRead",
            "StaffNotificationController#markAllAsRead",
            "StaffNotificationController#deleteNotification"
    );

    @Test
    @DisplayName("Har bir ERP endpointida @RequiresPermission yoki @PreAuthorize bo'lishi shart")
    void everyStaffEndpointIsAuthorized() throws Exception {
        List<String> unguarded = new ArrayList<>();

        for (Class<?> controller : scanControllers()) {
            if (PUBLIC_OR_SELF_SCOPED_CONTROLLERS.contains(controller.getSimpleName())) {
                continue;
            }
            if (isAuthorized(controller)) {
                continue; // sinf darajasida qo'yilgan — barcha metodlarni qamraydi
            }
            for (Method method : controller.getDeclaredMethods()) {
                if (!isEndpoint(method) || isAuthorized(method)) {
                    continue;
                }
                String key = controller.getSimpleName() + "#" + method.getName();
                if (!ALLOWED_UNGUARDED_METHODS.contains(key)) {
                    unguarded.add(key);
                }
            }
        }

        assertTrue(unguarded.isEmpty(), () -> """
                Quyidagi endpointlarda avtorizatsiya tekshiruvi yo'q:
                  %s
                Har biriga @RequiresPermission (yoki @PreAuthorize) qo'shing.
                Agar endpoint ATAYLAB ochiq bo'lsa — shu testdagi ALLOWED_UNGUARDED_METHODS
                ro'yxatiga sababi bilan qo'shing.""".formatted(String.join("\n  ", unguarded)));
    }

    private static List<Class<?>> scanControllers() throws ClassNotFoundException {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        List<Class<?>> controllers = new ArrayList<>();
        for (BeanDefinition bd : scanner.findCandidateComponents(CONTROLLER_PACKAGE)) {
            controllers.add(Class.forName(bd.getBeanClassName()));
        }
        assertTrue(controllers.size() > 20,
                "kontrollerlar topilmadi — skanerlash buzilgan bo'lishi mumkin");
        return controllers;
    }

    /** Metod HTTP endpoint'mi (@GetMapping va h.k. — barchasi @RequestMapping meta-annotatsiyasi). */
    private static boolean isEndpoint(Method method) {
        return method.getAnnotation(RequestMapping.class) != null
                || java.util.Arrays.stream(method.getAnnotations())
                        .anyMatch(a -> a.annotationType().isAnnotationPresent(RequestMapping.class));
    }

    private static boolean isAuthorized(java.lang.reflect.AnnotatedElement element) {
        return element.isAnnotationPresent(RequiresPermission.class)
                || element.isAnnotationPresent(PreAuthorize.class);
    }
}
