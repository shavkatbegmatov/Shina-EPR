package uz.shinamagazin.api.service.export;

import lombok.Builder;
import lombok.Data;
import uz.shinamagazin.api.annotation.ExportColumn;

import java.util.function.Function;

/**
 * Configuration class for export columns.
 * Contains metadata extracted from @ExportColumn annotations.
 */
@Data
@Builder
public class ExportColumnConfig {
    private String header;
    private int order;
    private ExportColumn.ColumnType type;
    private String format;
    private boolean sensitive;
    private String nestedField;
    private Function<Object, Object> valueExtractor;
}
