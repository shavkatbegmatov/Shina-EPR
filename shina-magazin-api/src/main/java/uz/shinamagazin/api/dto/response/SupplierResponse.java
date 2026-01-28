package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Supplier;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Ta'minotchilar",
    title = "Ta'minotchilar Hisoboti"
)
public class SupplierResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Nomi", order = 2)
    private String name;

    @ExportColumn(header = "Aloqa shaxsi", order = 3)
    private String contactPerson;

    @ExportColumn(header = "Telefon", order = 4)
    private String phone;

    @ExportColumn(header = "Email", order = 5)
    private String email;

    @ExportColumn(header = "Manzil", order = 6)
    private String address;

    @ExportColumn(header = "Bank rekvizitlari", order = 7, sensitive = true)
    private String bankDetails;

    @ExportColumn(header = "Balans", order = 8, type = ColumnType.CURRENCY)
    private BigDecimal balance;

    @ExportColumn(header = "Qarzi bor", order = 9, type = ColumnType.BOOLEAN)
    private boolean hasDebt;

    @ExportColumn(header = "Izohlar", order = 10)
    private String notes;

    @ExportColumn(header = "Faol", order = 11, type = ColumnType.BOOLEAN)
    private Boolean active;

    @ExportColumn(header = "Yaratilgan sana", order = 12, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    @ExportColumn(header = "Yangilangan sana", order = 13, type = ColumnType.DATETIME)
    private LocalDateTime updatedAt;

    public static SupplierResponse from(Supplier supplier) {
        return SupplierResponse.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .phone(supplier.getPhone())
                .email(supplier.getEmail())
                .address(supplier.getAddress())
                .bankDetails(supplier.getBankDetails())
                .balance(supplier.getBalance())
                .hasDebt(supplier.getBalance().compareTo(BigDecimal.ZERO) > 0)
                .notes(supplier.getNotes())
                .active(supplier.getActive())
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }
}
