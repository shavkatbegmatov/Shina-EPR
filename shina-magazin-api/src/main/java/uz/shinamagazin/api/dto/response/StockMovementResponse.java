package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.enums.MovementType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Zaxira Harakatlari", title = "Zaxira Harakatlari Hisoboti")
public class StockMovementResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    private Long productId; // Not exported

    @ExportColumn(header = "Mahsulot", order = 2)
    private String productName;

    @ExportColumn(header = "SKU", order = 3)
    private String productSku;

    @ExportColumn(header = "Harakat turi", order = 4, type = ColumnType.ENUM)
    private MovementType movementType;

    @ExportColumn(header = "Miqdor", order = 5, type = ColumnType.NUMBER)
    private Integer quantity;

    @ExportColumn(header = "Oldingi zaxira", order = 6, type = ColumnType.NUMBER)
    private Integer previousStock;

    @ExportColumn(header = "Yangi zaxira", order = 7, type = ColumnType.NUMBER)
    private Integer newStock;

    @ExportColumn(header = "Havola turi", order = 8)
    private String referenceType;

    @ExportColumn(header = "Havola ID", order = 9, type = ColumnType.NUMBER)
    private Long referenceId;

    @ExportColumn(header = "Izoh", order = 10)
    private String notes;

    @ExportColumn(header = "Kim yaratgan", order = 11)
    private String createdByName;

    @ExportColumn(header = "Yaratilgan", order = 12, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    public static StockMovementResponse from(StockMovement movement) {
        return StockMovementResponse.builder()
                .id(movement.getId())
                .productId(movement.getProduct().getId())
                .productName(movement.getProduct().getName())
                .productSku(movement.getProduct().getSku())
                .movementType(movement.getMovementType())
                .quantity(movement.getQuantity())
                .previousStock(movement.getPreviousStock())
                .newStock(movement.getNewStock())
                .referenceType(movement.getReferenceType())
                .referenceId(movement.getReferenceId())
                .notes(movement.getNotes())
                .createdByName(movement.getCreatedBy().getFullName())
                .createdAt(movement.getCreatedAt())
                .build();
    }
}
