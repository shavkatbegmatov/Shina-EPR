package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.response.CustomerPortalProfileResponse;
import uz.shinamagazin.api.dto.response.DebtResponse;
import uz.shinamagazin.api.dto.response.SaleResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Debt;
import uz.shinamagazin.api.entity.Sale;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.DebtRepository;
import uz.shinamagazin.api.repository.SaleRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerPortalService {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final DebtRepository debtRepository;

    /**
     * Mijoz profilini olish
     */
    public CustomerPortalProfileResponse getProfile(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));
        return CustomerPortalProfileResponse.from(customer);
    }

    /**
     * Tilni yangilash
     */
    @Transactional
    public CustomerPortalProfileResponse updateLanguage(Long customerId, String language) {
        if (!"uz".equals(language) && !"ru".equals(language)) {
            throw new BadRequestException("Noto'g'ri til: " + language);
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        customer.setPreferredLanguage(language);
        customerRepository.save(customer);

        log.info("Customer {} changed language to {}", customerId, language);
        return CustomerPortalProfileResponse.from(customer);
    }

    /**
     * Xaridlar tarixini olish
     */
    public Page<SaleResponse> getPurchases(Long customerId, Pageable pageable) {
        return saleRepository.findByCustomerId(customerId, pageable)
                .map(SaleResponse::from);
    }

    /**
     * Xarid tafsilotlarini olish
     */
    public SaleResponse getPurchaseDetails(Long customerId, Long saleId) {
        Sale sale = saleRepository.findByIdWithItems(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Xarid", "id", saleId));

        // Xarid shu mijozniki ekanligini tekshirish
        if (sale.getCustomer() == null || !sale.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Xarid", "id", saleId);
        }

        return SaleResponse.from(sale);
    }

    /**
     * Qarzlar ro'yxatini olish
     */
    public List<DebtResponse> getDebts(Long customerId) {
        List<Debt> debts = debtRepository.findByCustomerId(customerId);
        return debts.stream()
                .map(DebtResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Aktiv qarzlar summasini olish
     */
    public BigDecimal getTotalDebt(Long customerId) {
        BigDecimal total = debtRepository.getCustomerTotalDebt(customerId);
        return total != null ? total : BigDecimal.ZERO;
    }

    /**
     * Dashboard uchun umumiy statistika
     */
    public CustomerDashboardStats getDashboardStats(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));

        BigDecimal totalDebt = getTotalDebt(customerId);
        long totalPurchases = saleRepository.findByCustomerId(customerId, Pageable.unpaged()).getTotalElements();

        return CustomerDashboardStats.builder()
                .balance(customer.getBalance())
                .totalDebt(totalDebt)
                .totalPurchases(totalPurchases)
                .hasDebt(totalDebt.compareTo(BigDecimal.ZERO) > 0)
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CustomerDashboardStats {
        private BigDecimal balance;
        private BigDecimal totalDebt;
        private long totalPurchases;
        private boolean hasDebt;
    }
}
