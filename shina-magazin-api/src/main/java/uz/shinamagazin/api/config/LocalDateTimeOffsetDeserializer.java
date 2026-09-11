package uz.shinamagazin.api.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.deser.ContextualDeserializer;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jackson.JsonComponent;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * {@link LocalDateTime} ni JSON'dan o'qish — offset bilan ham, usiz ham.
 *
 * <p>{@link LocalDateTimeOffsetSerializer} javoblarni {@code +05:00} bilan yuboradi;
 * mijoz o'sha qatorni qaytarib yuborsa ({@code "…+05:00"}, {@code "…Z"} yoki boshqa
 * zonadan {@code "…-04:00"}) u Toshkent devor vaqtiga aylantiriladi — ilova ichida
 * hamma narsa avvalgidek {@code LocalDateTime} (Toshkent). Zona belgisisiz qator
 * ({@code "2026-09-11T19:06:41"}, {@code "2026-09-11 19:06:41"}) avvalgidek
 * Toshkent vaqti deb olinadi — eski mijozlar buzilmaydi.
 */
@JsonComponent
public class LocalDateTimeOffsetDeserializer extends StdDeserializer<LocalDateTime> implements ContextualDeserializer {

    private final ZoneId zone;

    public LocalDateTimeOffsetDeserializer(@Value("${spring.jackson.time-zone:Asia/Tashkent}") String zone) {
        super(LocalDateTime.class);
        this.zone = ZoneId.of(zone);
    }

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        if (p.currentToken() != JsonToken.VALUE_STRING) {
            return (LocalDateTime) ctxt.handleUnexpectedToken(LocalDateTime.class, p);
        }
        String text = p.getText().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(text).atZoneSameInstant(zone).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // offset yo'q — quyida
        }
        try {
            return ZonedDateTime.parse(text).withZoneSameInstant(zone).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // zona identifikatori ham yo'q — quyida
        }
        String naive = text.length() > 10 && text.charAt(10) == ' '
                ? text.substring(0, 10) + 'T' + text.substring(11)
                : text;
        try {
            return LocalDateTime.parse(naive);
        } catch (DateTimeParseException e) {
            return (LocalDateTime) ctxt.handleWeirdStringValue(LocalDateTime.class, text,
                    "ISO-8601 sana-vaqt kutilgan edi (offset bilan yoki usiz)");
        }
    }

    /** {@code @JsonFormat(pattern = "...")} qo'yilgan maydon o'z formatida o'qiladi. */
    @Override
    public JsonDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) throws JsonMappingException {
        JsonFormat.Value format = findFormatOverrides(ctxt, property, LocalDateTime.class);
        if (format != null && format.hasPattern()) {
            return new LocalDateTimeDeserializer(DateTimeFormatter.ofPattern(format.getPattern()));
        }
        return this;
    }
}
