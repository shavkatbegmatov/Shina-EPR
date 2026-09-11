package uz.shinamagazin.api.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.ContextualSerializer;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jackson.JsonComponent;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * {@link LocalDateTime} JSON'ga zona siljishi BILAN yoziladi:
 * {@code "2026-09-11T19:06:41.202714+05:00"} (ilgari {@code "2026-09-11T19:06:41.202714"}).
 *
 * <p>Barcha vaqtlar Toshkent devor vaqtida saqlanadi (JVM zonasi ilova kirish
 * nuqtasida o'rnatiladi, Hibernate {@code jdbc.time_zone}, {@code spring.jackson.time-zone} —
 * hammasi bitta zona). Zona belgisisiz qatorni har bir mijoz (brauzer, mobil ilova,
 * tashqi integratsiya) o'zicha talqin qilardi: brauzer uni O'Z zonasida o'qib,
 * Toshkentdan tashqarida soatlarni surardi. Offset bilan qator ISO-8601 bo'yicha
 * bir ma'noli — {@code new Date(...)}, {@code OffsetDateTime.parse}, Kotlin/Swift
 * parserlari hammasi to'g'ri instantni oladi.
 *
 * <p>Sana-vaqt qismi avvalgidek (mikrosekundgacha, nol kasr yozilmaydi): eski
 * mijozlar qatorning boshini kesib olsa ham ({@code slice(0, 16)}) buzilmaydi.
 * Maydonda {@code @JsonFormat(pattern = ...)} bo'lsa o'sha format saqlanadi.
 *
 * <p>{@code @JsonComponent}: Boot uni JavaTimeModule'dan KEYIN ro'yxatga oladi, ya'ni
 * standart {@code LocalDateTimeSerializer} o'rnini bosadi (Jackson oxirgi ro'yxatga
 * olingan modulni birinchi so'raydi). Bir xil zona {@link LocalDateTimeOffsetDeserializer}
 * bilan.
 */
@JsonComponent
public class LocalDateTimeOffsetSerializer extends StdSerializer<LocalDateTime> implements ContextualSerializer {

    private final ZoneId zone;

    public LocalDateTimeOffsetSerializer(@Value("${spring.jackson.time-zone:Asia/Tashkent}") String zone) {
        super(LocalDateTime.class);
        this.zone = ZoneId.of(zone);
    }

    @Override
    public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider provider) throws IOException {
        gen.writeString(value.atZone(zone).toOffsetDateTime().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
    }

    /** {@code @JsonFormat(pattern = "...")} qo'yilgan maydon o'z formatida qoladi. */
    @Override
    public JsonSerializer<?> createContextual(SerializerProvider prov, BeanProperty property) throws JsonMappingException {
        JsonFormat.Value format = findFormatOverrides(prov, property, LocalDateTime.class);
        if (format != null && format.hasPattern()) {
            return new LocalDateTimeSerializer(DateTimeFormatter.ofPattern(format.getPattern()));
        }
        return this;
    }
}
