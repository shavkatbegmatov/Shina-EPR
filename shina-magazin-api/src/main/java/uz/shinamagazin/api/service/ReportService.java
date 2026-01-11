package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.SalesReportResponse;
import uz.shinamagazin.api.dto.response.WarehouseReportResponse;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.entity.SaleItem;
import uz.shinamagazin.api.entity.StockMovement;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.SaleStatus;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.SaleRepository;
import uz.shinamagazin.api.repository.StockMovementRepository;

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
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

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

    public WarehouseReportResponse getWarehouseReport(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);

        List<Product> allProducts = productRepository.findByActiveTrue();
        List<StockMovement> movements = stockMovementRepository.findByDateRange(start, end);

        // Basic stats
        long totalProducts = allProducts.size();
        long totalStock = allProducts.stream().mapToLong(Product::getQuantity).sum();
        long lowStockCount = allProducts.stream()
                .filter(p -> p.getQuantity() > 0 && p.getQuantity() <= p.getMinStockLevel())
                .count();
        long outOfStockCount = allProducts.stream()
                .filter(p -> p.getQuantity() == 0)
                .count();

        // Stock value calculation
        BigDecimal totalStockValue = allProducts.stream()
                .map(p -> {
                    BigDecimal price = p.getPurchasePrice() != null ? p.getPurchasePrice() : BigDecimal.ZERO;
                    return price.multiply(BigDecimal.valueOf(p.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPotentialRevenue = allProducts.stream()
                .map(p -> p.getSellingPrice().multiply(BigDecimal.valueOf(p.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Movement stats
        long totalIncoming = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.IN)
                .mapToInt(m -> Math.abs(m.getQuantity()))
                .sum();

        long totalOutgoing = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.OUT)
                .mapToInt(m -> Math.abs(m.getQuantity()))
                .sum();

        long inMovementsCount = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.IN)
                .count();

        long outMovementsCount = movements.stream()
                .filter(m -> m.getMovementType() == MovementType.OUT)
                .count();

        // Stock by category
        List<WarehouseReportResponse.StockByCategory> stockByCategory = getStockByCategory(allProducts);

        // Stock by brand
        List<WarehouseReportResponse.StockByBrand> stockByBrand = getStockByBrand(allProducts);

        // Low stock products
        List<WarehouseReportResponse.LowStockProduct> lowStockProducts = allProducts.stream()
                .filter(p -> p.getQuantity() <= p.getMinStockLevel())
                .sorted(Comparator.comparingInt(Product::getQuantity))
                .limit(20)
                .map(p -> WarehouseReportResponse.LowStockProduct.builder()
                        .productId(p.getId())
                        .productName(p.getName())
                        .productSku(p.getSku())
                        .currentStock(p.getQuantity())
                        .minStockLevel(p.getMinStockLevel())
                        .sellingPrice(p.getSellingPrice())
                        .build())
                .collect(Collectors.toList());

        // Daily movement summary
        List<WarehouseReportResponse.MovementSummary> recentMovements = getMovementSummary(movements, startDate, endDate);

        return WarehouseReportResponse.builder()
                .totalProducts(totalProducts)
                .totalStock(totalStock)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .totalStockValue(totalStockValue)
                .totalPotentialRevenue(totalPotentialRevenue)
                .totalIncoming(totalIncoming)
                .totalOutgoing(totalOutgoing)
                .inMovementsCount(inMovementsCount)
                .outMovementsCount(outMovementsCount)
                .stockByCategory(stockByCategory)
                .stockByBrand(stockByBrand)
                .lowStockProducts(lowStockProducts)
                .recentMovements(recentMovements)
                .build();
    }

    private List<WarehouseReportResponse.StockByCategory> getStockByCategory(List<Product> products) {
        Map<Long, CategoryAggregator> categoryMap = new HashMap<>();

        for (Product product : products) {
            if (product.getCategory() == null) continue;

            Long categoryId = product.getCategory().getId();
            CategoryAggregator agg = categoryMap.computeIfAbsent(categoryId, k -> {
                CategoryAggregator a = new CategoryAggregator();
                a.categoryId = categoryId;
                a.categoryName = product.getCategory().getName();
                return a;
            });
            agg.productCount++;
            agg.totalStock += product.getQuantity();
            BigDecimal price = product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;
            agg.stockValue = agg.stockValue.add(price.multiply(BigDecimal.valueOf(product.getQuantity())));
        }

        return categoryMap.values().stream()
                .sorted((a, b) -> Long.compare(b.totalStock, a.totalStock))
                .map(a -> WarehouseReportResponse.StockByCategory.builder()
                        .categoryId(a.categoryId)
                        .categoryName(a.categoryName)
                        .productCount(a.productCount)
                        .totalStock(a.totalStock)
                        .stockValue(a.stockValue)
                        .build())
                .collect(Collectors.toList());
    }

    private List<WarehouseReportResponse.StockByBrand> getStockByBrand(List<Product> products) {
        Map<Long, BrandAggregator> brandMap = new HashMap<>();

        for (Product product : products) {
            if (product.getBrand() == null) continue;

            Long brandId = product.getBrand().getId();
            BrandAggregator agg = brandMap.computeIfAbsent(brandId, k -> {
                BrandAggregator a = new BrandAggregator();
                a.brandId = brandId;
                a.brandName = product.getBrand().getName();
                return a;
            });
            agg.productCount++;
            agg.totalStock += product.getQuantity();
            BigDecimal price = product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;
            agg.stockValue = agg.stockValue.add(price.multiply(BigDecimal.valueOf(product.getQuantity())));
        }

        return brandMap.values().stream()
                .sorted((a, b) -> Long.compare(b.totalStock, a.totalStock))
                .map(a -> WarehouseReportResponse.StockByBrand.builder()
                        .brandId(a.brandId)
                        .brandName(a.brandName)
                        .productCount(a.productCount)
                        .totalStock(a.totalStock)
                        .stockValue(a.stockValue)
                        .build())
                .collect(Collectors.toList());
    }

    private List<WarehouseReportResponse.MovementSummary> getMovementSummary(
            List<StockMovement> movements, LocalDate startDate, LocalDate endDate) {

        Map<String, MovementAggregator> movementMap = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Initialize all days
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            movementMap.put(date.format(formatter), new MovementAggregator());
        }

        // Aggregate movements
        for (StockMovement movement : movements) {
            String dateKey = movement.getCreatedAt().toLocalDate().format(formatter);
            MovementAggregator agg = movementMap.get(dateKey);
            if (agg != null) {
                if (movement.getMovementType() == MovementType.IN) {
                    agg.inCount++;
                    agg.inQuantity += Math.abs(movement.getQuantity());
                } else if (movement.getMovementType() == MovementType.OUT) {
                    agg.outCount++;
                    agg.outQuantity += Math.abs(movement.getQuantity());
                }
            }
        }

        return movementMap.entrySet().stream()
                .map(e -> WarehouseReportResponse.MovementSummary.builder()
                        .date(e.getKey())
                        .inCount(e.getValue().inCount)
                        .outCount(e.getValue().outCount)
                        .inQuantity(e.getValue().inQuantity)
                        .outQuantity(e.getValue().outQuantity)
                        .build())
                .collect(Collectors.toList());
    }

    // Helper classes
    private static class DailyAggregator {
        BigDecimal revenue = BigDecimal.ZERO;
        long count = 0;
    }

    private static class CategoryAggregator {
        Long categoryId;
        String categoryName;
        long productCount = 0;
        long totalStock = 0;
        BigDecimal stockValue = BigDecimal.ZERO;
    }

    private static class BrandAggregator {
        Long brandId;
        String brandName;
        long productCount = 0;
        long totalStock = 0;
        BigDecimal stockValue = BigDecimal.ZERO;
    }

    private static class MovementAggregator {
        long inCount = 0;
        long outCount = 0;
        int inQuantity = 0;
        int outQuantity = 0;
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
