package uz.shinamagazin.api.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import uz.shinamagazin.api.dto.request.DebtFullPaymentRequest;
import uz.shinamagazin.api.dto.response.DebtResponse;
import uz.shinamagazin.api.service.DebtService;
import uz.shinamagazin.api.service.export.GenericExportService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "To'liq to'lash" so'rovi summasiz ham qabul qilinishini qulflaydi.
 *
 * <p><b>Nima buzilgan edi:</b> endpoint {@code DebtPaymentRequest} ni qabul
 * qilardi, unda {@code amount} — {@code @NotNull}. Frontend esa summani
 * ATAYLAB yubormasdi (to'liq to'lovda uni server biladi). Natijada har bir
 * "To'liq to'lash" bosishi 400 bilan tugardi — servisga umuman yetib
 * bormasdan, garchi servisning birinchi ishi o'sha summani qoldiq bilan
 * almashtirish bo'lsa ham.
 *
 * <p>Test ATAYLAB to'liq MVC zanjirini ishlatadi: xato validatsiya
 * qatlamida edi, ya'ni servis metodini to'g'ridan-to'g'ri chaqiradigan test
 * uni umuman ko'rmasdi.
 */
class DebtFullPaymentValidationTest {

    private DebtService debtService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        debtService = mock(DebtService.class);
        mockMvc = MockMvcBuilders
                .standaloneSetup(new DebtController(debtService, mock(GenericExportService.class)))
                .build();
    }

    @Test
    @DisplayName("Summasiz so'rov qabul qilinadi")
    void fullPaymentWithoutAmountIsAccepted() throws Exception {
        when(debtService.makeFullPayment(eq(1L), any())).thenReturn(new DebtResponse());

        mockMvc.perform(post("/v1/debts/1/pay-full")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"method\":\"CASH\",\"notes\":\"QW\"}"))
                .andExpect(status().isOk());

        verify(debtService).makeFullPayment(eq(1L), any(DebtFullPaymentRequest.class));
    }

    /**
     * To'lov usuli esa MAJBURIY bo'lib qoladi: usulsiz to'lov yozuvi
     * kassada qaysi pul kelganini ko'rsatmasdi.
     */
    @Test
    @DisplayName("To'lov usulisiz so'rov rad etiladi")
    void fullPaymentWithoutMethodIsRejected() throws Exception {
        mockMvc.perform(post("/v1/debts/1/pay-full")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"QW\"}"))
                .andExpect(status().isBadRequest());

        verify(debtService, never()).makeFullPayment(any(), any());
    }
}
