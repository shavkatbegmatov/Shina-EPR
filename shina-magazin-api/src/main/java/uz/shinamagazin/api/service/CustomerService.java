package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CustomerRequest;
import uz.shinamagazin.api.dto.response.CustomerResponse;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final StaffNotificationService notificationService;

    public Page<CustomerResponse> getAllCustomers(Pageable pageable) {
        return customerRepository.findByActiveTrue(pageable)
                .map(CustomerResponse::from);
    }

    public Page<CustomerResponse> searchCustomers(String search, Pageable pageable) {
        return customerRepository.searchCustomers(search, pageable)
                .map(CustomerResponse::from);
    }

    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", id));
        return CustomerResponse.from(customer);
    }

    public CustomerResponse getCustomerByPhone(String phone) {
        Customer customer = customerRepository.findByPhone(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "telefon", phone));
        return CustomerResponse.from(customer);
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan: " + request.getPhone());
        }

        Customer customer = new Customer();
        mapRequestToCustomer(request, customer);
        customer.setBalance(BigDecimal.ZERO);
        customer.setCreatedBy(getCurrentUser());

        Customer savedCustomer = customerRepository.save(customer);

        // Send notification about new customer
        notificationService.notifyNewCustomer(
                savedCustomer.getFullName(),
                savedCustomer.getPhone(),
                savedCustomer.getId()
        );

        return CustomerResponse.from(savedCustomer);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", id));

        if (!customer.getPhone().equals(request.getPhone()) &&
                customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan: " + request.getPhone());
        }

        mapRequestToCustomer(request, customer);
        Customer savedCustomer = customerRepository.save(customer);
        return CustomerResponse.from(savedCustomer);
    }

    @Transactional
    public void deleteCustomer(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", id));
        customer.setActive(false);
        customerRepository.save(customer);
    }

    public List<CustomerResponse> getCustomersWithDebt() {
        return customerRepository.findCustomersWithDebt().stream()
                .map(CustomerResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateBalance(Long customerId, BigDecimal amount) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", customerId));
        customer.setBalance(customer.getBalance().add(amount));
        customerRepository.save(customer);
    }

    private void mapRequestToCustomer(CustomerRequest request, Customer customer) {
        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setPhone2(request.getPhone2());
        customer.setAddress(request.getAddress());
        customer.setCompanyName(request.getCompanyName());
        customer.setCustomerType(request.getCustomerType());
        customer.setNotes(request.getNotes());
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }
}
