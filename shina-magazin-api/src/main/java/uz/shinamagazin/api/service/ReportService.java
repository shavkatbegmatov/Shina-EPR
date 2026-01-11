package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.SalesReportResponse;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.SaleItem;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.SaleStatus;
import uz.shinamagazin.api.repository.SaleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final SaleRepository saleRepository;

    public SalesReportResponse getSalesReport(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end);

        // Completed sales only for revenue
        List<Sale> completedSales = sales.stream()
                .filter(s -> s.getStatus() == SaleStatus.COMPLETED)
                .collect(Collectors.toList());

        // Calculate totals
        BigDecimal totalRevenue = completedSales.stream()
                .map(Sale::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProfit = calculateProfit(completedSales);

        long cancelledCount = sales.stream()
                .filter(s -> s.getStatus() == SaleStatus.CANCELLED)
                .count();

        BigDecimal averageSaleAmount = completedSales.isEmpty() ? BigDecimal.ZERO :
                totalRevenue.divide(BigDecimal.valueOf(completedSales.size()), 2, RoundingMode.HALF_UP);

        // Payment method breakdown
        BigDecimal cashTotal = completedSales.stream()
                .filter(s -> s.getPaymentMethod() == PaymentMethod.CASH)
                .map(Sale::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cardTotal = completedSales.stream()
                .filter(s -> s.getPaymentMethod() == PaymentMethod.CARD)
                .map(Sale::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal transferTotal = completedSales.stream()
                .filter(s -> s.getPaymentMethod() == PaymentMethod.TRANSFER)
                .map(Sale::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal debtTotal = completedSales.stream()
                .map(Sale::getDebtAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Daily data
        List<SalesReportResponse.DailySalesData> dailyData = getDailyData(completedSales, startDate, endDate);

        // Top products
        List<SalesReportResponse.TopSellingProduct> topProducts = getTopProducts(completedSales);

        // Top customers
        List<SalesReportResponse.TopCustomer> topCustomers = getTopCustomers(completedSales);

        return SalesReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalProfit(totalProfit)
                .totalSalesCount(sales.size())
                .completedSalesCount(completedSales.size())
                .cancelledSalesCount(cancelledCount)
                .averageSaleAmount(averageSaleAmount)
                .cashTotal(cashTotal)
                .cardTotal(cardTotal)
                .transferTotal(transferTotal)
                .debtTotal(debtTotal)
                .dailyData(dailyData)
                .topProducts(topProducts)
                .topCustomers(topCustomers)
                .build();
    }

    private BigDecimal calculateProfit(List<Sale> completedSales) {
        BigDecimal profit = BigDecimal.ZERO;
        for (Sale sale : completedSales) {
            for (SaleItem item : sale.getItems()) {
                BigDecimal costPrice = item.getProduct().getPurchasePrice();
                if (costPrice != null) {
                    BigDecimal itemProfit = item.getUnitPrice()
                            .subtract(costPrice)
                            .multiply(BigDecimal.valueOf(item.getQuantity()));
                    profit = profit.add(itemProfit);
                }
            }
        }
        return profit;
    }

    private List<SalesReportResponse.DailySalesData> getDailyData(
            List<Sale> sales, LocalDate startDate, LocalDate endDate) {

        Map<String, DailyAggregator> dailyMap = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Initialize all days
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            dailyMap.put(date.format(formatter), new DailyAggregator());
        }

        // Aggregate sales
        for (Sale sale : sales) {
            String dateKey = sale.getSaleDate().toLocalDate().format(formatter);
            DailyAggregator agg = dailyMap.get(dateKey);
            if (agg != null) {
                agg.revenue = agg.revenue.add(sale.getTotalAmount());
                agg.count++;
            }
        }

        return dailyMap.entrySet().stream()
                .map(e -> SalesReportResponse.DailySalesData.builder()
                        .date(e.getKey())
                        .revenue(e.getValue().revenue)
                        .salesCount(e.getValue().count)
                        .build())
                .collect(Collectors.toList());
    }

    private List<SalesReportResponse.TopSellingProduct> getTopProducts(List<Sale> sales) {
        Map<Long, ProductAggregator> productMap = new HashMap<>();

        for (Sale sale : sales) {
            for (SaleItem item : sale.getItems()) {
                Long productId = item.getProduct().getId();
                ProductAggregator agg = productMap.computeIfAbsent(productId, k -> {
                    ProductAggregator a = new ProductAggregator();
                    a.productId = productId;
                    a.productName = item.getProduct().getName();
                    a.productSku = item.getProduct().getSku();
                    return a;
                });
                agg.quantitySold += item.getQuantity();
                agg.totalRevenue = agg.totalRevenue.add(item.getTotalPrice());
            }
        }

        return productMap.values().stream()
                .sorted((a, b) -> Integer.compare(b.quantitySold, a.quantitySold))
                .limit(10)
                .map(a -> SalesReportResponse.TopSellingProduct.builder()
                        .productId(a.productId)
                        .productName(a.productName)
                        .productSku(a.productSku)
                        .quantitySold(a.quantitySold)
                        .totalRevenue(a.totalRevenue)
                        .build())
                .collect(Collectors.toList());
    }

    private List<SalesReportResponse.TopCustomer> getTopCustomers(List<Sale> sales) {
        Map<Long, CustomerAggregator> customerMap = new HashMap<>();

        for (Sale sale : sales) {
            if (sale.getCustomer() == null) continue;

            Long customerId = sale.getCustomer().getId();
            CustomerAggregator agg = customerMap.computeIfAbsent(customerId, k -> {
                CustomerAggregator a = new CustomerAggregator();
                a.customerId = customerId;
                a.customerName = sale.getCustomer().getFullName();
                a.customerPhone = sale.getCustomer().getPhone();
                return a;
            });
            agg.purchaseCount++;
            agg.totalSpent = agg.totalSpent.add(sale.getTotalAmount());
        }

        return customerMap.values().stream()
                .sorted((a, b) -> b.totalSpent.compareTo(a.totalSpent))
                .limit(10)
                .map(a -> SalesReportResponse.TopCustomer.builder()
                        .customerId(a.customerId)
                        .customerName(a.customerName)
                        .customerPhone(a.customerPhone)
                        .purchaseCount(a.purchaseCount)
                        .totalSpent(a.totalSpent)
                        .build())
                .collect(Collectors.toList());
    }

    // Helper classes
    private static class DailyAggregator {
        BigDecimal revenue = BigDecimal.ZERO;
        long count = 0;
    }

    private static class ProductAggregator {
        Long productId;
        String productName;
        String productSku;
        int quantitySold = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
    }

    private static class CustomerAggregator {
        Long customerId;
        String customerName;
        String customerPhone;
        int purchaseCount = 0;
        BigDecimal totalSpent = BigDecimal.ZERO;
    }
}
