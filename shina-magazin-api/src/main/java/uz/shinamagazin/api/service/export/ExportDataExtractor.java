package uz.shinamagazin.api.service.export;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import uz.shinamagazin.api.annotation.ExportColumn;

import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service for extracting export column configurations from annotated classes.
 * Uses reflection with caching for performance optimization.
 */
@Slf4j
@Component
public class ExportDataExtractor {

    private final Map<Class<?>, List<ExportColumnConfig>> cache = new ConcurrentHashMap<>();

    /**
     * Extract column configurations from annotated class (cached)
     */
    public <T> List<ExportColumnConfig> extractColumns(Class<T> clazz) {
        return cache.computeIfAbsent(clazz, this::doExtractColumns);
    }

    private <T> List<ExportColumnConfig> doExtractColumns(Class<T> clazz) {
        return Arrays.stream(clazz.getDeclaredFields())
                .filter(field -> field.isAnnotationPresent(ExportColumn.class))
                .map(this::createColumnConfig)
                .sorted(Comparator.comparingInt(ExportColumnConfig::getOrder))
                .collect(Collectors.toList());
    }

    private ExportColumnConfig createColumnConfig(Field field) {
        ExportColumn annotation = field.getAnnotation(ExportColumn.class);
        field.setAccessible(true);

        return ExportColumnConfig.builder()
                .header(annotation.header())
                .order(annotation.order())
                .type(annotation.type())
                .format(annotation.format())
                .sensitive(annotation.sensitive())
                .nestedField(annotation.nestedField())
                .valueExtractor(entity -> extractValue(field, entity, annotation.nestedField()))
                .build();
    }

    private Object extractValue(Field field, Object entity, String nestedField) {
        try {
            Object value = field.get(entity);

            // Handle nested objects (e.g., brand.name)
            if (value != null && !nestedField.isEmpty()) {
                Field nestedFieldObj = value.getClass().getDeclaredField(nestedField);
                nestedFieldObj.setAccessible(true);
                return nestedFieldObj.get(value);
            }

            return value;
        } catch (IllegalAccessException | NoSuchFieldException e) {
            log.error("Failed to extract value from field: {}", field.getName(), e);
            return null;
        }
    }
}
