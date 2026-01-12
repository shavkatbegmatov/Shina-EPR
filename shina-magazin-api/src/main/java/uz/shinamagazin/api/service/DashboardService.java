package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.ChartDataResponse;
import uz.shinamagazin.api.dto.response.ChartDataResponse.*;
import uz.shinamagazin.api.dto.response.DashboardStatsResponse;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final DebtRepository debtRepository;

    private static final Map<String, String> PAYMENT_LABELS = Map.of(
            "CASH", "Naqd pul",
            "CARD", "Plastik karta",
            "TRANSFER", "Bank o'tkazmasi",
            "MIXED", "Aralash",
            "DEBT", "Qarzga"
    );

    private static final String[] WEEKDAY_NAMES = {"Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"};

    public DashboardStatsResponse getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        long todaySalesCount = saleRepository.countTodaySales(startOfDay, endOfDay);
        BigDecimal todayRevenue = saleRepository.getTodayRevenue(startOfDay, endOfDay);
        BigDecimal totalRevenue = saleRepository.getTotalRevenue();
        long totalProducts = productRepository.countActiveProducts();
        Long totalStock = productRepository.getTotalStock();
        long lowStockCount = productRepository.findLowStockProducts().size();
        long totalCustomers = customerRepository.countActiveCustomers();
        BigDecimal totalDebt = debtRepository.getTotalActiveDebt();

        return DashboardStatsResponse.builder()
                .todaySalesCount(todaySalesCount)
                .todayRevenue(todayRevenue != null ? todayRevenue : BigDecimal.ZERO)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .totalProducts(totalProducts)
                .totalStock(totalStock != null ? totalStock : 0L)
                .lowStockCount(lowStockCount)
                .totalCustomers(totalCustomers)
                .totalDebt(totalDebt != null ? totalDebt.abs() : BigDecimal.ZERO)
                .build();
    }

    public ChartDataResponse getChartData(int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = now.minusDays(days).toLocalDate().atStartOfDay();
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime endOfToday = LocalDate.now().atTime(LocalTime.MAX);

        // Hafta boshi va oxiri
        LocalDateTime thisWeekStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toLocalDate().atStartOfDay();
        LocalDateTime lastWeekStart = thisWeekStart.minusWeeks(1);
        LocalDateTime lastWeekEnd = thisWeekStart;

        // Oy boshi va oxiri
        LocalDateTime thisMonthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime lastMonthStart = thisMonthStart.minusMonths(1);
        LocalDateTime lastMonthEnd = thisMonthStart;

        // 1. Sotuvlar trendi
        List<SalesTrendItem> salesTrend = buildSalesTrend(startDate, days);

        // 2. Top mahsulotlar
        List<TopProductItem> topProducts = buildTopProducts(startDate, 10);

        // 3. To'lov usullari
        List<PaymentMethodItem> paymentMethods = buildPaymentMethodStats(startDate);

        // 4. Kategoriyalar bo'yicha
        List<CategorySalesItem> categorySales = buildCategorySales(startDate);

        // 5. Hafta kunlari bo'yicha
        List<WeekdaySalesItem> weekdaySales = buildWeekdaySales(startDate);

        // 6. Soatlar bo'yicha (bugungi)
        List<HourlySalesItem> hourlySales = buildHourlySales(startOfToday, endOfToday);

        // 7. Daromad statistikasi
        BigDecimal thisWeekRevenue = saleRepository.getRevenueForPeriod(thisWeekStart, now);
        BigDecimal lastWeekRevenue = saleRepository.getRevenueForPeriod(lastWeekStart, lastWeekEnd);
        BigDecimal thisMonthRevenue = saleRepository.getRevenueForPeriod(thisMonthStart, now);
        BigDecimal lastMonthRevenue = saleRepository.getRevenueForPeriod(lastMonthStart, lastMonthEnd);

        // O'sish foizlari
        Double revenueGrowthPercent = calculateGrowthPercent(thisWeekRevenue, lastWeekRevenue);

        Long thisWeekSales = saleRepository.getSalesCountForPeriod(thisWeekStart, now);
        Long lastWeekSales = saleRepository.getSalesCountForPeriod(lastWeekStart, lastWeekEnd);
        Double salesGrowthPercent = calculateGrowthPercent(
                BigDecimal.valueOf(thisWeekSales != null ? thisWeekSales : 0),
                BigDecimal.valueOf(lastWeekSales != null ? lastWeekSales : 0)
        );

        return ChartDataResponse.builder()
                .salesTrend(salesTrend)
                .topProducts(topProducts)
                .paymentMethods(paymentMethods)
                .categorySales(categorySales)
                .weekdaySales(weekdaySales)
                .hourlySales(hourlySales)
                .thisWeekRevenue(thisWeekRevenue != null ? thisWeekRevenue : BigDecimal.ZERO)
                .lastWeekRevenue(lastWeekRevenue != null ? lastWeekRevenue : BigDecimal.ZERO)
                .thisMonthRevenue(thisMonthRevenue != null ? thisMonthRevenue : BigDecimal.ZERO)
                .lastMonthRevenue(lastMonthRevenue != null ? lastMonthRevenue : BigDecimal.ZERO)
                .revenueGrowthPercent(revenueGrowthPercent)
                .salesGrowthPercent(salesGrowthPercent)
                .build();
    }

    private List<SalesTrendItem> buildSalesTrend(LocalDateTime startDate, int days) {
        List<Object[]> rawData = saleRepository.getSalesTrend(startDate);
        Map<LocalDate, Object[]> dataMap = new HashMap<>();

        for (Object[] row : rawData) {
            LocalDate date;
            if (row[0] instanceof Date) {
                date = ((Date) row[0]).toLocalDate();
            } else {
                date = (LocalDate) row[0];
            }
            dataMap.put(date, row);
        }

        List<SalesTrendItem> result = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MMM", new Locale("uz"));

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            Object[] data = dataMap.get(date);

            result.add(SalesTrendItem.builder()
                    .date(date.format(formatter))
                    .salesCount(data != null ? ((Number) data[1]).longValue() : 0L)
                    .revenue(data != null ? (BigDecimal) data[2] : BigDecimal.ZERO)
                    .build());
        }

        return result;
    }

    private List<TopProductItem> buildTopProducts(LocalDateTime startDate, int limit) {
        List<Object[]> rawData = saleItemRepository.getTopProductsByRevenue(startDate, PageRequest.of(0, limit));

        return rawData.stream()
                .map(row -> TopProductItem.builder()
                        .productId(((Number) row[0]).longValue())
                        .productName((String) row[1])
                        .productSku((String) row[2])
                        .quantitySold(((Number) row[3]).longValue())
                        .revenue((BigDecimal) row[4])
                        .build())
                .collect(Collectors.toList());
    }

    private List<PaymentMethodItem> buildPaymentMethodStats(LocalDateTime startDate) {
        List<Object[]> rawData = saleRepository.getPaymentMethodStats(startDate);
        BigDecimal totalAmount = rawData.stream()
                .map(row -> (BigDecimal) row[2])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rawData.stream()
                .map(row -> {
                    String method = (String) row[0];
                    BigDecimal amount = (BigDecimal) row[2];
                    double percentage = totalAmount.compareTo(BigDecimal.ZERO) > 0
                            ? amount.divide(totalAmount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                            : 0.0;

                    return PaymentMethodItem.builder()
                            .method(method)
                            .methodLabel(PAYMENT_LABELS.getOrDefault(method, method))
                            .count(((Number) row[1]).longValue())
                            .amount(amount)
                            .percentage(percentage)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<CategorySalesItem> buildCategorySales(LocalDateTime startDate) {
        List<Object[]> rawData = saleItemRepository.getCategorySales(startDate);
        BigDecimal totalRevenue = rawData.stream()
                .map(row -> (BigDecimal) row[3])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rawData.stream()
                .map(row -> {
                    BigDecimal revenue = (BigDecimal) row[3];
                    double percentage = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                            ? revenue.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                            : 0.0;

                    return CategorySalesItem.builder()
                            .categoryId(((Number) row[0]).longValue())
                            .categoryName((String) row[1])
                            .quantitySold(((Number) row[2]).longValue())
                            .revenue(revenue)
                            .percentage(percentage)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<WeekdaySalesItem> buildWeekdaySales(LocalDateTime startDate) {
        List<Object[]> rawData = saleRepository.getWeekdaySales(startDate);
        Map<Integer, Object[]> dataMap = new HashMap<>();

        for (Object[] row : rawData) {
            int dayOfWeek = ((Number) row[0]).intValue();
            dataMap.put(dayOfWeek, row);
        }

        List<WeekdaySalesItem> result = new ArrayList<>();
        // PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
        for (int i = 0; i < 7; i++) {
            Object[] data = dataMap.get(i);
            result.add(WeekdaySalesItem.builder()
                    .day(WEEKDAY_NAMES[i])
                    .dayOfWeek(i)
                    .salesCount(data != null ? ((Number) data[1]).longValue() : 0L)
                    .revenue(data != null ? (BigDecimal) data[2] : BigDecimal.ZERO)
                    .build());
        }

        return result;
    }

    private List<HourlySalesItem> buildHourlySales(LocalDateTime startOfToday, LocalDateTime endOfToday) {
        List<Object[]> rawData = saleRepository.getHourlySales(startOfToday, endOfToday);
        Map<Integer, Object[]> dataMap = new HashMap<>();

        for (Object[] row : rawData) {
            int hour = ((Number) row[0]).intValue();
            dataMap.put(hour, row);
        }

        List<HourlySalesItem> result = new ArrayList<>();
        for (int hour = 8; hour <= 22; hour++) {  // 08:00 - 22:00 ish vaqti
            Object[] data = dataMap.get(hour);
            result.add(HourlySalesItem.builder()
                    .hour(hour)
                    .hourLabel(String.format("%02d:00", hour))
                    .salesCount(data != null ? ((Number) data[1]).longValue() : 0L)
                    .revenue(data != null ? (BigDecimal) data[2] : BigDecimal.ZERO)
                    .build());
        }

        return result;
    }

    private Double calculateGrowthPercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return current != null && current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        if (current == null) {
            return -100.0;
        }
        return current.subtract(previous)
                .divide(previous, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }
}
