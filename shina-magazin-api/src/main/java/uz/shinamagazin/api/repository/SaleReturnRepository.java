package uz.shinamagazin.api.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.shinamagazin.api.entity.SaleReturn;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Repository
public interface SaleReturnRepository extends JpaRepository<SaleReturn, Long> {

    @EntityGraph(attributePaths = {"sale", "createdBy"})
    List<SaleReturn> findBySaleIdOrderByReturnDateDesc(Long saleId);

    /**
     * Savdo qatorlari bo'yicha allaqachon qaytarilgan miqdorlar.
     *
     * <p>Ortiqcha qaytarishni to'sish uchun: mijoz 2 dona olib, avval 1 tasini,
     * keyin yana 2 tasini qaytara olmasligi kerak.
     */
    @Query("""
            SELECT ri.saleItem.id, COALESCE(SUM(ri.quantity), 0)
            FROM SaleReturnItem ri
            WHERE ri.saleReturn.sale.id = :saleId
            GROUP BY ri.saleItem.id""")
    List<Object[]> sumReturnedQuantitiesBySale(@Param("saleId") Long saleId);

    default Map<Long, Long> returnedQuantitiesBySale(Long saleId) {
        return sumReturnedQuantitiesBySale(saleId).stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).longValue()));
    }

    /**
     * Smenada kassadan chiqqan pul.
     *
     * <p>Z-hisobotda kutilgan naqddan AYIRILADI — aks holda kassa kam chiqib,
     * kassirga asossiz kamomad yozilardi.
     */
    @Query("""
            SELECT COALESCE(SUM(r.cashRefunded), 0) FROM SaleReturn r
            WHERE r.shift.id = :shiftId""")
    BigDecimal sumCashRefundedByShift(@Param("shiftId") Long shiftId);

    /**
     * Shu smenadagi qaytarimlarning naqd hisobda ALLAQACHON aks etgan qismi.
     *
     * <p>Savdo NAQD bo'lib, AYNI SHU smenada qilingan bo'lsa,
     * {@code createReturn} uning {@code paidAmount} ini kamaytirgan —
     * {@code summarizeByPaymentMethod} dagi naqd tushum shu kamayishni o'zi
     * ko'rsatadi. Z-hisobotda {@code cashRefunded} ni to'liq ayirishdan oldin
     * shu qism qaytarib qo'shiladi, aks holda qaytarim IKKI MARTA ayirilib,
     * kassir aynan qaytarim summasi miqdorida kamomadni yashira olardi.
     */
    @Query("""
            SELECT COALESCE(SUM(r.cashRefunded), 0)
            FROM SaleReturn r
            JOIN r.sale s
            WHERE r.shift.id = :shiftId
              AND s.paymentMethod = uz.shinamagazin.api.enums.PaymentMethod.CASH
              AND s.shift.id = :shiftId""")
    BigDecimal sumCashRefundedNettedInPaid(@Param("shiftId") Long shiftId);

    @Query("SELECT COUNT(r) FROM SaleReturn r WHERE r.shift.id = :shiftId")
    long countByShift(@Param("shiftId") Long shiftId);

    /**
     * Savdo bo'yicha allaqachon qaytarilgan PUL.
     *
     * <p>Miqdor chegarasidan tashqari summa chegarasi ham kerak: qatorlar
     * bo'yicha yaxlitlash tiyinlik farq berishi mumkin, u esa savdo
     * summasidan ortiq qaytarishga yo'l ochardi.
     */
    @Query("""
            SELECT COALESCE(SUM(r.refundAmount), 0) FROM SaleReturn r
            WHERE r.sale.id = :saleId""")
    BigDecimal sumRefundedBySale(@Param("saleId") Long saleId);

    /**
     * Davrdagi qaytarishlar — P&amp;L uchun qatorlari bilan.
     *
     * <p>Qatorlar kerak, chunki qaytarish faqat tushumni emas, TANNARXNI ham
     * kamaytiradi: tovar omborga qaytdi, uning tannarxi endi sotilgan
     * tovarlar tannarxida turmasligi kerak.
     */
    @Query("""
            SELECT DISTINCT r FROM SaleReturn r
            LEFT JOIN FETCH r.items i
            LEFT JOIN FETCH i.saleItem
            LEFT JOIN FETCH i.product
            WHERE r.returnDate BETWEEN :start AND :end""")
    List<SaleReturn> findByReturnDateBetweenWithItems(@Param("start") java.time.LocalDateTime start,
                                                      @Param("end") java.time.LocalDateTime end);
}
