package uz.shinamagazin.api.service.export;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import uz.shinamagazin.api.exception.BadRequestException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Eksport chegarasini qulflaydi.
 *
 * <p>13 ta eksport endpointi {@code maxRecords} ni to'g'ridan-to'g'ri
 * {@code PageRequest} ga uzatardi, yuqori chegarasiz. {@code ?maxRecords=100000000}
 * butun jadvalni bitta ro'yxatga yuklab, undan Excel/PDF ni xotirada qurardi —
 * bitta so'rov ilovani OOM bilan yiqita olardi.
 */
class ExportSupportTest {

    @Test
    @DisplayName("Chegaradan katta so'rov RAD ETILADI (jimgina kesilmaydi)")
    void rejectsRequestAboveLimit() {
        assertThatThrownBy(() -> ExportSupport.pageable(100_000_000))
                .as("xabar nima qilish kerakligini aytishi kerak")
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("maksimal")
                .hasMessageContaining("Filtr qo'ying");

        assertThatThrownBy(() -> ExportSupport.pageable(ExportSupport.MAX_EXPORT_ROWS + 1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Nol va manfiy qiymat rad etiladi (ilgari 500 berardi)")
    void rejectsZeroAndNegative() {
        // PageRequest.of(0, 0) IllegalArgumentException tashlardi va u
        // catch (Exception) orqali RuntimeException'ga o'ralib 500 bo'lardi.
        assertThatThrownBy(() -> ExportSupport.pageable(0))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ExportSupport.pageable(-1))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Oddiy qiymatlar (default 10 000 va aniq chegara) qabul qilinadi")
    void acceptsValidSizes() {
        assertThat(ExportSupport.pageable(1).getPageSize()).isEqualTo(1);
        assertThat(ExportSupport.pageable(10_000).getPageSize()).isEqualTo(10_000);
        assertThat(ExportSupport.pageable(ExportSupport.MAX_EXPORT_ROWS).getPageSize())
                .isEqualTo(ExportSupport.MAX_EXPORT_ROWS);
    }

    @Test
    @DisplayName("Saralashli variant ham chegarani qo'llaydi va saralashni saqlaydi")
    void sortedVariantKeepsSortAndEnforcesLimit() {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        assertThatCode(() -> ExportSupport.pageable(100, sort)).doesNotThrowAnyException();
        assertThat(ExportSupport.pageable(100, sort).getSort()).isEqualTo(sort);

        assertThatThrownBy(() -> ExportSupport.pageable(100_000_000, sort))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Kesilgan eksport sarlavhalarda bildiriladi")
    void signalsTruncation() {
        // 10 000 so'raldi, jadvalda 15 000 bor -> fayl to'liq emas
        Page<String> page = new PageImpl<>(List.of("a", "b"), PageRequest.of(0, 2), 15_000);

        HttpHeaders headers = ExportSupport.truncationHeaders(page, "sotuvlar");

        assertThat(headers.getFirst(ExportSupport.HEADER_TRUNCATED)).isEqualTo("true");
        assertThat(headers.getFirst(ExportSupport.HEADER_RETURNED)).isEqualTo("2");
        assertThat(headers.getFirst(ExportSupport.HEADER_TOTAL)).isEqualTo("15000");
    }

    @Test
    @DisplayName("To'liq eksportda truncated=false")
    void noTruncationWhenComplete() {
        Page<String> page = new PageImpl<>(List.of("a", "b"), PageRequest.of(0, 100), 2);

        HttpHeaders headers = ExportSupport.truncationHeaders(page, "sotuvlar");

        assertThat(headers.getFirst(ExportSupport.HEADER_TRUNCATED)).isEqualTo("false");
        assertThat(headers.getFirst(ExportSupport.HEADER_TOTAL)).isEqualTo("2");
    }
}
