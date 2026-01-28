package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.enums.CustomerType;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Mijozlar",
    title = "Mijozlar Hisoboti"
)
public class CustomerResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "F.I.SH", order = 2)
    private String fullName;

    @ExportColumn(header = "Telefon", order = 3)
    private String phone;

    @ExportColumn(header = "Telefon 2", order = 4)
    private String phone2;

    @ExportColumn(header = "Manzil", order = 5)
    private String address;

    @ExportColumn(header = "Kompaniya", order = 6)
    private String companyName;

    @ExportColumn(header = "Turi", order = 7, type = ColumnType.ENUM)
    private CustomerType customerType;

    @ExportColumn(header = "Balans", order = 8, type = ColumnType.CURRENCY)
    private BigDecimal balance;

    @ExportColumn(header = "Qarzi bor", order = 9, type = ColumnType.BOOLEAN)
    private boolean hasDebt;

    @ExportColumn(header = "Izohlar", order = 10)
    private String notes;

    @ExportColumn(header = "Faol", order = 11, type = ColumnType.BOOLEAN)
    private Boolean active;

    public static CustomerResponse from(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .phone2(customer.getPhone2())
                .address(customer.getAddress())
                .companyName(customer.getCompanyName())
                .customerType(customer.getCustomerType())
                .balance(customer.getBalance())
                .hasDebt(customer.getBalance().compareTo(BigDecimal.ZERO) < 0)
                .notes(customer.getNotes())
                .active(customer.getActive())
                .build();
    }
}
