package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.DebtsReportResponse;
import uz.shinamagazin.api.dto.response.ProfitLossResponse;
import uz.shinamagazin.api.dto.response.SalesReportResponse;
import uz.shinamagazin.api.dto.response.WarehouseReportResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.DebtStatus;
import uz.shinamagazin.api.enums.ExpenseCategory;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.PaymentMethod;
import uz.shinamagazin.api.enums.SaleStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.repository.*;

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
    private final DebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final ExpenseRepository expenseRepository;
    private final SaleReturnRepository saleReturnRepository;

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

    /**
     * Yalpi foyda: tushum − tannarx.
     *
     * <p>Ilgari bu yerda ikkita xato bor edi:
     * <ul>
     *   <li>{@code unitPrice} ishlatilardi — chegirma hisobga olinmasdi, ya'ni
     *       chegirma bilan sotilgan savdolarda foyda OSHIB ko'rinardi;
     *   <li>tannarx sifatida mahsulotning JORIY xarid narxi olinardi — bugun
     *       narx o'zgarsa o'tgan oyning foydasi ham o'zgarardi.
     * </ul>
     */
    private BigDecimal calculateProfit(List<Sale> completedSales) {
        BigDecimal profit = BigDecimal.ZERO;
        for (Sale sale : completedSales) {
            for (SaleItem item : sale.getItems()) {
                BigDecimal cost = lineCost(item);
                if (cost != null) {
                    profit = profit.add(item.getTotalPrice().subtract(cost));
                }
            }
        }
        return profit;
    }

    /**
     * Savdo qatorining tannarxi (miqdorga ko'paytirilgan).
     *
     * <p>Avval qatorda muhrlangan tannarx, u yo'q bo'lsa (V34 gacha yozilgan
     * savdolar) mahsulotning joriy xarid narxi. Ikkalasi ham yo'q bo'lsa
     * {@code null} — bunday qator tannarxi NOMA'LUM, uni nol deb hisoblash
     * foydani soxta oshirardi.
     */
    private BigDecimal lineCost(SaleItem item) {
        BigDecimal unitCost = item.getCostPrice();
        if (unitCost == null && item.getProduct() != null) {
            unitCost = item.getProduct().getPurchasePrice();
        }
        return unitCost == null ? null : unitCost.multiply(BigDecimal.valueOf(item.getQuantity()));
    }

    /**
     * Foyda va zarar hisoboti (P&amp;L).
     *
     * <p>Tushum va tannarx bir xil davrga tegishli savdolardan, xarajatlar esa
     * {@code expenseDate} bo'yicha olinadi.
     *
     * <p>Savdolar orasiga {@link SaleStatus#REFUNDED} ham KIRADI: qaytarish
     * alohida qator sifatida ayiriladi, shuning uchun to'liq qaytarilgan
     * savdoni tushumdan ham chiqarib tashlash summani ikki marta kamaytirardi.
     */
    public ProfitLossResponse getProfitLoss(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new BadRequestException("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
        }

        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, PlAggregator> daily = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            daily.put(date.format(formatter), new PlAggregator());
        }

        // ─── Savdolar: tushum va tannarx ───
        List<Sale> sales = saleRepository.findBySaleDateBetween(start, end).stream()
                .filter(s -> s.getStatus() != SaleStatus.CANCELLED)
                .toList();

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        long itemsWithoutCost = 0;

        for (Sale sale : sales) {
            String dateKey = sale.getSaleDate().toLocalDate().format(formatter);
            PlAggregator agg = daily.get(dateKey);

            for (SaleItem item : sale.getItems()) {
                BigDecimal lineRevenue = item.getTotalPrice();
                BigDecimal lineCost = lineCost(item);
                if (lineCost == null) {
                    itemsWithoutCost++;
                    lineCost = BigDecimal.ZERO;
                }

                revenue = revenue.add(lineRevenue);
                cogs = cogs.add(lineCost);
                if (agg != null) {
                    agg.revenue = agg.revenue.add(lineRevenue);
                    agg.cogs = agg.cogs.add(lineCost);
                }
            }
        }

        // ─── Qaytarishlar: tushumni ham, tannarxni ham kamaytiradi ───
        List<SaleReturn> returns = saleReturnRepository.findByReturnDateBetweenWithItems(start, end);
        BigDecimal returnsTotal = BigDecimal.ZERO;

        for (SaleReturn saleReturn : returns) {
            String dateKey = saleReturn.getReturnDate().toLocalDate().format(formatter);
            PlAggregator agg = daily.get(dateKey);

            returnsTotal = returnsTotal.add(saleReturn.getRefundAmount());
            if (agg != null) {
                agg.returns = agg.returns.add(saleReturn.getRefundAmount());
            }

            for (SaleReturnItem item : saleReturn.getItems()) {
                // Tovar omborga qaytdi — uning tannarxi sotilganlar tannarxidan
                // chiqadi. Aks holda qaytarish yalpi foydani ikki marta urardi:
                // ham tushum kamayardi, ham tannarx qolib ketardi.
                BigDecimal unitCost = item.getSaleItem() != null ? item.getSaleItem().getCostPrice() : null;
                if (unitCost == null && item.getProduct() != null) {
                    unitCost = item.getProduct().getPurchasePrice();
                }
                if (unitCost == null) continue;

                BigDecimal returnedCost = unitCost.multiply(BigDecimal.valueOf(item.getQuantity()));
                cogs = cogs.subtract(returnedCost);
                if (agg != null) {
                    agg.cogs = agg.cogs.subtract(returnedCost);
                }
            }
        }

        BigDecimal netRevenue = revenue.subtract(returnsTotal);
        BigDecimal grossProfit = netRevenue.subtract(cogs);

        // ─── Xarajatlar ───
        BigDecimal totalExpenses = expenseRepository.sumTotal(startDate, endDate);
        List<ProfitLossResponse.ExpenseBreakdown> byCategory = new ArrayList<>();
        long expensesCount = 0;

        for (Object[] row : expenseRepository.sumByCategory(startDate, endDate)) {
            ExpenseCategory category = (ExpenseCategory) row[0];
            BigDecimal amount = (BigDecimal) row[1];
            long count = ((Number) row[2]).longValue();
            expensesCount += count;

            byCategory.add(ProfitLossResponse.ExpenseBreakdown.builder()
                    .category(category)
                    .amount(amount)
                    .count(count)
                    .percent(percentOf(amount, totalExpenses))
                    .build());
        }
        byCategory.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));

        for (Object[] row : expenseRepository.sumByDate(startDate, endDate)) {
            PlAggregator agg = daily.get(((LocalDate) row[0]).format(formatter));
            if (agg != null) {
                agg.expenses = agg.expenses.add((BigDecimal) row[1]);
            }
        }

        BigDecimal netProfit = grossProfit.subtract(totalExpenses);

        List<ProfitLossResponse.DailyProfitLoss> dailyData = daily.entrySet().stream()
                .map(e -> {
                    PlAggregator a = e.getValue();
                    BigDecimal dayRevenue = a.revenue.subtract(a.returns);
                    BigDecimal dayGross = dayRevenue.subtract(a.cogs);
                    return ProfitLossResponse.DailyProfitLoss.builder()
                            .date(e.getKey())
                            .revenue(dayRevenue)
                            .grossProfit(dayGross)
                            .expenses(a.expenses)
                            .netProfit(dayGross.subtract(a.expenses))
                            .build();
                })
                .collect(Collectors.toList());

        return ProfitLossResponse.builder()
                .startDate(startDate.format(formatter))
                .endDate(endDate.format(formatter))
                .revenue(revenue)
                .returns(returnsTotal)
                .netRevenue(netRevenue)
                .costOfGoodsSold(cogs)
                .grossProfit(grossProfit)
                .grossMarginPercent(percentOf(grossProfit, netRevenue))
                .totalExpenses(totalExpenses)
                .expensesByCategory(byCategory)
                .netProfit(netProfit)
                .netMarginPercent(percentOf(netProfit, netRevenue))
                .salesCount(sales.size())
                .returnsCount(returns.size())
                .expensesCount(expensesCount)
                .daily(dailyData)
                .itemsWithoutCost(itemsWithoutCost)
                .build();
    }

    /** {@code part / whole * 100}, maxraj nol bo'lsa nol (cheksizlik o'rniga). */
    private BigDecimal percentOf(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return part.multiply(BigDecimal.valueOf(100))
                .divide(whole, 2, RoundingMode.HALF_UP);
    }

    private static class PlAggregator {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal returns = BigDecimal.ZERO;
        BigDecimal cogs = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
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

    public DebtsReportResponse getDebtsReport(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        LocalDate today = LocalDate.now();

        // Get all debts
        List<Debt> allDebts = debtRepository.findAll();
        List<Payment> payments = paymentRepository.findByPaymentDateBetween(start, end);

        // Active debts
        List<Debt> activeDebts = allDebts.stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .collect(Collectors.toList());

        // Paid debts in period
        List<Debt> paidDebts = allDebts.stream()
                .filter(d -> d.getStatus() == DebtStatus.PAID)
                .collect(Collectors.toList());

        // Overdue debts
        List<Debt> overdueDebts = activeDebts.stream()
                .filter(d -> d.getDueDate() != null && d.getDueDate().isBefore(today))
                .collect(Collectors.toList());

        // Calculate totals
        BigDecimal totalActiveDebt = activeDebts.stream()
                .map(Debt::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaidDebt = paidDebts.stream()
                .map(Debt::getOriginalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOverdueDebt = overdueDebts.stream()
                .map(Debt::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPaymentsReceived = payments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal averageDebtAmount = activeDebts.isEmpty() ? BigDecimal.ZERO :
                totalActiveDebt.divide(BigDecimal.valueOf(activeDebts.size()), 2, RoundingMode.HALF_UP);

        // Top debtors
        List<DebtsReportResponse.CustomerDebtSummary> topDebtors = getTopDebtors(activeDebts, overdueDebts);

        // Debt aging
        List<DebtsReportResponse.DebtAging> debtAging = getDebtAging(activeDebts, today);

        // Recent payments
        List<DebtsReportResponse.PaymentSummary> recentPayments = getPaymentSummary(payments, startDate, endDate);

        // Overdue debts list
        List<DebtsReportResponse.OverdueDebt> overdueDebtsList = overdueDebts.stream()
                .sorted((a, b) -> Long.compare(
                        java.time.temporal.ChronoUnit.DAYS.between(b.getDueDate(), today),
                        java.time.temporal.ChronoUnit.DAYS.between(a.getDueDate(), today)))
                .limit(20)
                .map(d -> DebtsReportResponse.OverdueDebt.builder()
                        .debtId(d.getId())
                        .customerId(d.getCustomer().getId())
                        .customerName(d.getCustomer().getFullName())
                        .customerPhone(d.getCustomer().getPhone())
                        .remainingAmount(d.getRemainingAmount())
                        .dueDate(d.getDueDate().toString())
                        .daysOverdue((int) java.time.temporal.ChronoUnit.DAYS.between(d.getDueDate(), today))
                        .build())
                .collect(Collectors.toList());

        return DebtsReportResponse.builder()
                .totalActiveDebt(totalActiveDebt)
                .totalPaidDebt(totalPaidDebt)
                .totalOverdueDebt(totalOverdueDebt)
                .activeDebtsCount(activeDebts.size())
                .paidDebtsCount(paidDebts.size())
                .overdueDebtsCount(overdueDebts.size())
                .totalPaymentsReceived(totalPaymentsReceived)
                .paymentsCount(payments.size())
                .averageDebtAmount(averageDebtAmount)
                .topDebtors(topDebtors)
                .debtAging(debtAging)
                .recentPayments(recentPayments)
                .overdueDebts(overdueDebtsList)
                .build();
    }

    private List<DebtsReportResponse.CustomerDebtSummary> getTopDebtors(List<Debt> activeDebts, List<Debt> overdueDebts) {
        Map<Long, DebtorAggregator> debtorMap = new HashMap<>();
        Set<Long> overdueCustomerIds = overdueDebts.stream()
                .map(d -> d.getCustomer().getId())
                .collect(Collectors.toSet());

        for (Debt debt : activeDebts) {
            Long customerId = debt.getCustomer().getId();
            DebtorAggregator agg = debtorMap.computeIfAbsent(customerId, k -> {
                DebtorAggregator a = new DebtorAggregator();
                a.customerId = customerId;
                a.customerName = debt.getCustomer().getFullName();
                a.customerPhone = debt.getCustomer().getPhone();
                return a;
            });
            agg.totalDebt = agg.totalDebt.add(debt.getRemainingAmount());
            agg.debtsCount++;
            if (overdueCustomerIds.contains(customerId) && debt.getDueDate() != null &&
                debt.getDueDate().isBefore(LocalDate.now())) {
                agg.overdueCount++;
            }
        }

        return debtorMap.values().stream()
                .sorted((a, b) -> b.totalDebt.compareTo(a.totalDebt))
                .limit(10)
                .map(a -> DebtsReportResponse.CustomerDebtSummary.builder()
                        .customerId(a.customerId)
                        .customerName(a.customerName)
                        .customerPhone(a.customerPhone)
                        .totalDebt(a.totalDebt)
                        .debtsCount(a.debtsCount)
                        .overdueCount(a.overdueCount)
                        .build())
                .collect(Collectors.toList());
    }

    private List<DebtsReportResponse.DebtAging> getDebtAging(List<Debt> activeDebts, LocalDate today) {
        long current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;
        BigDecimal currentAmt = BigDecimal.ZERO, days30Amt = BigDecimal.ZERO,
                   days60Amt = BigDecimal.ZERO, days90Amt = BigDecimal.ZERO, over90Amt = BigDecimal.ZERO;

        for (Debt debt : activeDebts) {
            if (debt.getDueDate() == null) {
                current++;
                currentAmt = currentAmt.add(debt.getRemainingAmount());
                continue;
            }

            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(debt.getDueDate(), today);
            if (daysOverdue <= 0) {
                current++;
                currentAmt = currentAmt.add(debt.getRemainingAmount());
            } else if (daysOverdue <= 30) {
                days30++;
                days30Amt = days30Amt.add(debt.getRemainingAmount());
            } else if (daysOverdue <= 60) {
                days60++;
                days60Amt = days60Amt.add(debt.getRemainingAmount());
            } else if (daysOverdue <= 90) {
                days90++;
                days90Amt = days90Amt.add(debt.getRemainingAmount());
            } else {
                over90++;
                over90Amt = over90Amt.add(debt.getRemainingAmount());
            }
        }

        List<DebtsReportResponse.DebtAging> aging = new ArrayList<>();
        aging.add(DebtsReportResponse.DebtAging.builder().period("Joriy").count(current).amount(currentAmt).build());
        aging.add(DebtsReportResponse.DebtAging.builder().period("1-30 kun").count(days30).amount(days30Amt).build());
        aging.add(DebtsReportResponse.DebtAging.builder().period("31-60 kun").count(days60).amount(days60Amt).build());
        aging.add(DebtsReportResponse.DebtAging.builder().period("61-90 kun").count(days90).amount(days90Amt).build());
        aging.add(DebtsReportResponse.DebtAging.builder().period("90+ kun").count(over90).amount(over90Amt).build());
        return aging;
    }

    private List<DebtsReportResponse.PaymentSummary> getPaymentSummary(
            List<Payment> payments, LocalDate startDate, LocalDate endDate) {

        Map<String, PaymentAggregator> paymentMap = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            paymentMap.put(date.format(formatter), new PaymentAggregator());
        }

        for (Payment payment : payments) {
            String dateKey = payment.getPaymentDate().toLocalDate().format(formatter);
            PaymentAggregator agg = paymentMap.get(dateKey);
            if (agg != null) {
                agg.count++;
                agg.amount = agg.amount.add(payment.getAmount());
            }
        }

        return paymentMap.entrySet().stream()
                .map(e -> DebtsReportResponse.PaymentSummary.builder()
                        .date(e.getKey())
                        .count(e.getValue().count)
                        .amount(e.getValue().amount)
                        .build())
                .collect(Collectors.toList());
    }

    private static class DebtorAggregator {
        Long customerId;
        String customerName;
        String customerPhone;
        BigDecimal totalDebt = BigDecimal.ZERO;
        int debtsCount = 0;
        int overdueCount = 0;
    }

    private static class PaymentAggregator {
        long count = 0;
        BigDecimal amount = BigDecimal.ZERO;
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
