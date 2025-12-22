package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.DashboardStatsResponse;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final DebtRepository debtRepository;

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
}
