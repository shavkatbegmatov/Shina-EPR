package uz.shinamagazin.api.service.export;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.annotation.ExportEntity;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

/**
 * Generic export service that works with any annotated entity.
 * Provides unified export functionality for Excel and PDF formats.
 *
 * Usage:
 * <pre>
 * {@code
 * ByteArrayOutputStream output = genericExportService.export(
 *     products,
 *     ProductResponse.class,
 *     ExportFormat.EXCEL,
 *     "Mahsulotlar Hisoboti"
 * );
 * }
 * </pre>
 */
@Service
@RequiredArgsConstructor
public class GenericExportService {

    private final ExportDataExtractor dataExtractor;
    private final ExportFormatter formatter;
    private final ExcelExportService excelService;
    private final PdfExportService pdfService;

    /**
     * Universal export method - works with any annotated entity
     *
     * @param data List of entities to export
     * @param entityClass Class of the entity (must have @ExportColumn annotations)
     * @param format Export format (EXCEL or PDF)
     * @param title Report title
     * @return ByteArrayOutputStream containing the exported file
     */
    public <T> ByteArrayOutputStream export(
            List<T> data,
            Class<T> entityClass,
            ExportFormat format,
            String title
    ) throws IOException {
        // Extract column configurations
        List<ExportColumnConfig> columns = dataExtractor.extractColumns(entityClass);

        // Get entity-level configuration
        ExportEntity entityConfig = entityClass.getAnnotation(ExportEntity.class);
        if (entityConfig == null) {
            entityConfig = createDefaultConfig();
        }

        // Transform to rows
        List<Map<String, Object>> rows = data.stream()
                .map(entity -> transformToRow(entity, columns))
                .toList();

        // Delegate to format-specific service
        return switch (format) {
            case EXCEL -> excelService.exportToExcel(rows, columns, entityConfig, title);
            case PDF -> pdfService.exportToPdf(rows, columns, entityConfig, title);
        };
    }

    private <T> Map<String, Object> transformToRow(T entity, List<ExportColumnConfig> columns) {
        Map<String, Object> row = new LinkedHashMap<>();

        for (ExportColumnConfig col : columns) {
            Object value = col.getValueExtractor().apply(entity);
            Object formatted = formatter.format(value, col);
            row.put(col.getHeader(), formatted);
        }

        return row;
    }

    private ExportEntity createDefaultConfig() {
        return new ExportEntity() {
            @Override
            public Class<? extends java.lang.annotation.Annotation> annotationType() {
                return ExportEntity.class;
            }

            @Override
            public String sheetName() { return "Export"; }

            @Override
            public String title() { return ""; }

            @Override
            public Orientation orientation() { return Orientation.PORTRAIT; }
        };
    }

    public enum ExportFormat {
        EXCEL, PDF
    }
}
