package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Xarid Elementlari", title = "Xarid Elementlari Hisoboti")
public class PurchaseItemResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    private Long productId; // Not exported

    @ExportColumn(header = "Mahsulot", order = 2)
    private String productName;

    @ExportColumn(header = "SKU", order = 3)
    private String productSku;

    @ExportColumn(header = "Miqdor", order = 4, type = ColumnType.NUMBER)
    private Integer quantity;

    @ExportColumn(header = "Birlik narxi", order = 5, type = ColumnType.CURRENCY)
    private BigDecimal unitPrice;

    @ExportColumn(header = "Jami narx", order = 6, type = ColumnType.CURRENCY)
    private BigDecimal totalPrice;
}
