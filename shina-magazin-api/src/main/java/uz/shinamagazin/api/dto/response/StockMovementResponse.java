package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.enums.MovementType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovementResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private MovementType movementType;
    private Integer quantity;
    private Integer previousStock;
    private Integer newStock;
    private String referenceType;
    private Long referenceId;
    private String notes;
    private String createdByName;
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
