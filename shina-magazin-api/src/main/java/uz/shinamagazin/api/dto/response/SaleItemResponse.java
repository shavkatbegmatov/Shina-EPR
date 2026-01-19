package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.SaleItem;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Sotuv Elementlari", title = "Sotuv Elementlari Hisoboti")
public class SaleItemResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    private Long productId; // Not exported

    @ExportColumn(header = "Mahsulot", order = 2)
    private String productName;

    @ExportColumn(header = "SKU", order = 3)
    private String productSku;

    @ExportColumn(header = "O'lcham", order = 4)
    private String sizeString;

    @ExportColumn(header = "Miqdor", order = 5, type = ColumnType.NUMBER)
    private Integer quantity;

    @ExportColumn(header = "Birlik narxi", order = 6, type = ColumnType.CURRENCY)
    private BigDecimal unitPrice;

    @ExportColumn(header = "Chegirma", order = 7, type = ColumnType.CURRENCY)
    private BigDecimal discount;

    @ExportColumn(header = "Jami narx", order = 8, type = ColumnType.CURRENCY)
    private BigDecimal totalPrice;

    public static SaleItemResponse from(SaleItem item) {
        return SaleItemResponse.builder()
                .id(item.getId())
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .productSku(item.getProduct().getSku())
                .sizeString(item.getProduct().getSizeString())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .discount(item.getDiscount())
                .totalPrice(item.getTotalPrice())
                .build();
    }
}
