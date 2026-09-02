package uz.shinamagazin.api.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.PermissionCode;
import uz.shinamagazin.api.enums.Role;
import uz.shinamagazin.api.service.PermissionService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Sinf darajasidagi {@code @RequiresPermission} haqiqatan tekshirilishi.
 *
 * <p>Annotatsiya {@code TYPE} target'ini ruxsat etadi va {@code ControllerAuthorizationCoverageTest}
 * sinfga qo'yilgan annotatsiyani "barcha metodlarni qamraydi" deb hisoblaydi. Aspekt
 * pointcut'i esa faqat {@code @annotation} edi — sinf darajasi uchun advice umuman
 * ishlamasdi. Bu test o'sha "himoyalangandek ko'rinadigan, aslida ochiq" holatni yopiq ushlaydi.
 */
class PermissionAspectClassLevelTest {

    @RequiresPermission(PermissionCode.PRODUCTS_VIEW)
    public static class GuardedByClass {
        public String list() {
            return "ok";
        }
    }

    private PermissionService permissionService;
    private GuardedByClass proxy;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        permissionService = mock(PermissionService.class);
        AspectJProxyFactory factory = new AspectJProxyFactory(new GuardedByClass());
        factory.addAspect(new PermissionAspect(permissionService));
        proxy = factory.getProxy();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Autentifikatsiyasiz chaqiruv sinf darajasidagi annotatsiya bilan ham rad etiladi")
    void unauthenticatedCallIsDenied() {
        assertThatThrownBy(proxy::list).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Ruxsati yo'q xodim rad etiladi, ruxsati bor o'tadi")
    void permissionIsActuallyChecked() {
        User user = User.builder().username("kassir").password("{noop}x").fullName("K").role(Role.SELLER).active(true).build();
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        // userId null (builder id bermaydi) — anyLong() null'ga mos kelmaydi; varargs uchun any(Class[])
        when(permissionService.hasAnyPermission(any(), any(PermissionCode[].class))).thenReturn(false);
        assertThatThrownBy(proxy::list).isInstanceOf(AccessDeniedException.class);

        when(permissionService.hasAnyPermission(any(), any(PermissionCode[].class))).thenReturn(true);
        assertThat(proxy.list()).isEqualTo("ok");
    }
}
