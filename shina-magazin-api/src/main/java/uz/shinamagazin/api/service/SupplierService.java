package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.SupplierRequest;
import uz.shinamagazin.api.dto.response.SupplierResponse;
import uz.shinamagazin.api.entity.Supplier;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.SupplierRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public Page<SupplierResponse> getAllSuppliers(Pageable pageable) {
        return supplierRepository.findByActiveTrue(pageable)
                .map(SupplierResponse::from);
    }

    public Page<SupplierResponse> searchSuppliers(String search, Pageable pageable) {
        return supplierRepository.searchSuppliers(search, pageable)
                .map(SupplierResponse::from);
    }

    public List<SupplierResponse> getActiveSuppliers() {
        return supplierRepository.findByActiveTrue().stream()
                .map(SupplierResponse::from)
                .collect(Collectors.toList());
    }

    public SupplierResponse getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", id));
        return SupplierResponse.from(supplier);
    }

    @Transactional
    public SupplierResponse createSupplier(SupplierRequest request) {
        if (supplierRepository.existsByName(request.getName())) {
            throw new BadRequestException("Bu nomdagi ta'minotchi allaqachon mavjud: " + request.getName());
        }

        Supplier supplier = new Supplier();
        mapRequestToSupplier(request, supplier);
        supplier.setBalance(BigDecimal.ZERO);

        Supplier savedSupplier = supplierRepository.save(supplier);
        return SupplierResponse.from(savedSupplier);
    }

    @Transactional
    public SupplierResponse updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", id));

        if (!supplier.getName().equals(request.getName()) &&
                supplierRepository.existsByName(request.getName())) {
            throw new BadRequestException("Bu nomdagi ta'minotchi allaqachon mavjud: " + request.getName());
        }

        mapRequestToSupplier(request, supplier);
        Supplier savedSupplier = supplierRepository.save(supplier);
        return SupplierResponse.from(savedSupplier);
    }

    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", id));
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    public List<SupplierResponse> getSuppliersWithDebt() {
        return supplierRepository.findSuppliersWithDebt().stream()
                .map(SupplierResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateBalance(Long supplierId, BigDecimal amount) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Ta'minotchi", "id", supplierId));
        supplier.setBalance(supplier.getBalance().add(amount));
        supplierRepository.save(supplier);
    }

    public BigDecimal getTotalDebt() {
        return supplierRepository.findSuppliersWithDebt().stream()
                .map(Supplier::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void mapRequestToSupplier(SupplierRequest request, Supplier supplier) {
        supplier.setName(request.getName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setPhone(request.getPhone());
        supplier.setEmail(request.getEmail());
        supplier.setAddress(request.getAddress());
        supplier.setBankDetails(request.getBankDetails());
        supplier.setNotes(request.getNotes());
    }
}
