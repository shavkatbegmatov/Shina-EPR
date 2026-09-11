package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.enums.PaymentStatus;
import uz.shinamagazin.api.enums.PurchaseCurrency;
import uz.shinamagazin.api.enums.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(
    sheetName = "Xaridlar",
    title = "Xarid Buyurtmalari Hisoboti",
    orientation = ExportEntity.Orientation.LANDSCAPE
)
public class PurchaseOrderResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Buyurtma raqami", order = 2)
    private String orderNumber;

    private Long supplierId; // Not exported

    @ExportColumn(header = "Ta'minotchi", order = 3)
    private String supplierName;

    @ExportColumn(header = "Buyurtma sanasi", order = 4, type = ColumnType.DATE)
    private LocalDate orderDate;

    @ExportColumn(header = "Muddat", order = 5, type = ColumnType.DATE)
    private LocalDate dueDate;

    @ExportColumn(header = "Jami summa", order = 6, type = ColumnType.CURRENCY)
    private BigDecimal totalAmount;

    @ExportColumn(header = "To'langan", order = 7, type = ColumnType.CURRENCY)
    private BigDecimal paidAmount;

    @ExportColumn(header = "Qarz", order = 8, type = ColumnType.CURRENCY)
    private BigDecimal debtAmount;

    @ExportColumn(header = "Holat", order = 9, type = ColumnType.ENUM)
    private PurchaseOrderStatus status;

    @ExportColumn(header = "To'lov holati", order = 10, type = ColumnType.ENUM)
    private PaymentStatus paymentStatus;

    @ExportColumn(header = "Izoh", order = 11)
    private String notes;

    private List<PurchaseItemResponse> items; // Not exported (complex type)

    @ExportColumn(header = "Elementlar soni", order = 12, type = ColumnType.NUMBER)
    private Integer itemCount;

    @ExportColumn(header = "Jami miqdor", order = 13, type = ColumnType.NUMBER)
    private Integer totalQuantity;

    @ExportColumn(header = "To'lovlar soni", order = 14, type = ColumnType.NUMBER)
    private Integer paymentCount;

    @ExportColumn(header = "Qaytarishlar soni", order = 15, type = ColumnType.NUMBER)
    private Integer returnCount;

    @ExportColumn(header = "Yaratilgan", order = 16, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    @ExportColumn(header = "Kim yaratgan", order = 17)
    private String createdByName;

    // ─── Kirim hujjati (ta'minotchi shabloni) ───

    @ExportColumn(header = "Ta'minotchi hujjati", order = 18)
    private String supplierDocNumber;

    private LocalDate supplierDocDate;

    @ExportColumn(header = "Mashina", order = 19)
    private String vehicleNumber;

    @ExportColumn(header = "Valyuta", order = 20, type = ColumnType.ENUM)
    private PurchaseCurrency currency;

    /** 1 birlik hujjat valyutasi = N so'm (UZS hujjatda 1). */
    @ExportColumn(header = "Kurs", order = 21, type = ColumnType.NUMBER)
    private BigDecimal exchangeRate;

    /** To'lov summasi hujjat valyutasida (UZS hujjatda null). */
    @ExportColumn(header = "Summa (valyuta)", order = 22, type = ColumnType.NUMBER)
    private BigDecimal foreignTotalAmount;

    /** Tovar summasi bonusgacha (so'm). */
    @ExportColumn(header = "Tovar summasi", order = 23, type = ColumnType.CURRENCY)
    private BigDecimal goodsAmount;

    @ExportColumn(header = "Bonus", order = 24, type = ColumnType.CURRENCY)
    private BigDecimal bonusAmount;

    @ExportColumn(header = "Yo'l haqi", order = 25, type = ColumnType.CURRENCY)
    private BigDecimal transportCost;

    /** Qabul qilingan jami miqdor (hamma qator bo'yicha). */
    private Integer totalReceivedQuantity;

    /** Hujjatdagi va qabul qilingan miqdor farqi (kamomad) — faqat qabul qilingan hujjatlarda. */
    private Integer shortageQuantity;

    /** "TEKSHIRILDI" — kim va qachon qabul qilgan. */
    @ExportColumn(header = "Qabul qilgan", order = 26)
    private String receivedByName;

    private LocalDateTime receivedAt;
}
