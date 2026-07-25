package uz.shinamagazin.api.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import uz.shinamagazin.api.dto.response.ApiResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Konkurentlik istisnolari mijozga MA'NOLI javob qaytarishini qulflaydi.
 *
 * Ilgari bu ikkalasi uchun handler yo'q edi, shuning uchun ular
 * {@code handleAllExceptions}ga tushib "Ichki server xatosi yuz berdi" (500)
 * qaytarardi. Amalda bu quyidagilarni anglatardi:
 *
 * <ul>
 *   <li>ikki xaridor bitta ommabop shinani bir vaqtda buyurtma qilsa —
 *       @Version oversell'ni to'g'ri to'sardi, lekin mijoz 500 ko'rardi
 *       va buyurtma yo'qolardi;</li>
 *   <li>ikki kassir bir vaqtda savdo qilsa — invoice_number UNIQUE buzilib
 *       yana 500, savdo yo'qolardi.</li>
 * </ul>
 *
 * 409 Conflict — bu holatlarning to'g'ri javobi: mijoz qayta urinishi mumkin.
 */
class GlobalExceptionHandlerConcurrencyTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("Optimistik qulf to'qnashuvi 500 emas, 409 qaytaradi")
    void optimisticLockingReturnsConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleOptimisticLockingFailure(
                new ObjectOptimisticLockingFailureException("Product", 1L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage())
                .as("xabar foydalanuvchiga qayta urinishni aytishi kerak")
                .contains("qayta urinib");
    }

    @Test
    @DisplayName("DB cheklovi buzilishi 500 emas, 409 qaytaradi")
    void dataIntegrityViolationReturnsConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException(
                        "duplicate key value violates unique constraint \"sales_invoice_number_key\""));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    @DisplayName("Cheklov/jadval nomlari javobda oshkor qilinmaydi")
    void constraintDetailsAreNotLeakedToClient() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                new DataIntegrityViolationException(
                        "duplicate key value violates unique constraint \"sales_invoice_number_key\""));

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage())
                .as("DB ichki tafsilotlari faqat logda qolishi kerak")
                .doesNotContain("sales_invoice_number_key")
                .doesNotContain("constraint")
                .doesNotContain("duplicate key");
    }
}
