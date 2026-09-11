package uz.shinamagazin.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.test.context.ContextConfiguration;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * API'dagi {@link LocalDateTime} maydonlari Toshkent offset'i bilan chiqadi va
 * offset bilan/usiz ikkalasi ham o'qiladi — Boot'ning haqiqiy {@code ObjectMapper}
 * i orqali ({@code @JsonTest}), ya'ni {@code @JsonComponent} ro'yxatga olinishi va
 * JavaTimeModule'ni bosib o'tishi ham tekshiriladi.
 */
@JsonTest
@ContextConfiguration(classes = {LocalDateTimeOffsetSerializer.class, LocalDateTimeOffsetDeserializer.class})
class LocalDateTimeOffsetJsonTest {

    @Autowired
    private ObjectMapper mapper;

    record Payload(LocalDateTime at, LocalDate day) {
    }

    @Test
    @DisplayName("LocalDateTime offset bilan yoziladi, sana-vaqt qismi avvalgidek")
    void serializesWithTashkentOffset() throws Exception {
        String json = mapper.writeValueAsString(
                new Payload(LocalDateTime.of(2026, 9, 11, 19, 6, 41, 202_714_000), LocalDate.of(2026, 9, 11)));

        assertThat(json).isEqualTo("{\"at\":\"2026-09-11T19:06:41.202714+05:00\",\"day\":\"2026-09-11\"}");
        // Nol kasr yozilmaydi — ilgari ham shunday edi
        assertThat(mapper.writeValueAsString(new Payload(LocalDateTime.of(2026, 9, 11, 0, 30), null)))
                .contains("\"2026-09-11T00:30:00+05:00\"");
        // null — null
        assertThat(mapper.writeValueAsString(new Payload(null, null))).isEqualTo("{\"at\":null,\"day\":null}");
    }

    @Test
    @DisplayName("offsetli, Z'li, zonali va offsetsiz qatorlar bir xil Toshkent vaqtiga o'qiladi")
    void deserializesAnyForm() throws Exception {
        LocalDateTime expected = LocalDateTime.of(2026, 9, 11, 19, 6, 41);
        for (String input : new String[] {
                "2026-09-11T19:06:41+05:00",
                "2026-09-11T14:06:41Z",
                "2026-09-11T10:06:41-04:00",
                "2026-09-11T19:06:41+05:00[Asia/Tashkent]",
                "2026-09-11T19:06:41",
                "2026-09-11 19:06:41",
        }) {
            Payload payload = mapper.readValue("{\"at\":\"" + input + "\"}", Payload.class);
            assertThat(payload.at()).as(input).isEqualTo(expected);
        }
        assertThat(mapper.readValue("{\"at\":\"2026-09-11T19:06:41.202714+05:00\"}", Payload.class).at())
                .isEqualTo(LocalDateTime.of(2026, 9, 11, 19, 6, 41, 202_714_000));
        assertThat(mapper.readValue("{\"at\":null}", Payload.class).at()).isNull();
        assertThat(mapper.readValue("{\"at\":\"\"}", Payload.class).at()).isNull();
    }

    @Test
    @DisplayName("noto'g'ri qator tushunarli xato beradi")
    void rejectsGarbage() {
        assertThatThrownBy(() -> mapper.readValue("{\"at\":\"bugun\"}", Payload.class))
                .hasMessageContaining("ISO-8601");
    }
}
