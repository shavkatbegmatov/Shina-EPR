package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.EmployeeStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.EmployeeRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    public Page<EmployeeResponse> getAllEmployees(Pageable pageable) {
        return employeeRepository.findByStatusNot(EmployeeStatus.TERMINATED, pageable)
                .map(EmployeeResponse::from);
    }

    public Page<EmployeeResponse> searchEmployees(String search, Pageable pageable) {
        return employeeRepository.searchEmployees(search, pageable)
                .map(EmployeeResponse::from);
    }

    public EmployeeResponse getEmployeeById(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xodim", "id", id));
        return EmployeeResponse.from(employee);
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        if (employeeRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan: " + request.getPhone());
        }

        Employee employee = new Employee();
        mapRequestToEmployee(request, employee);

        if (request.getUserId() != null) {
            linkUserToEmployee(employee, request.getUserId());
        }

        Employee savedEmployee = employeeRepository.save(employee);
        return EmployeeResponse.from(savedEmployee);
    }

    @Transactional
    public EmployeeResponse updateEmployee(Long id, EmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xodim", "id", id));

        if (!employee.getPhone().equals(request.getPhone()) &&
                employeeRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan: " + request.getPhone());
        }

        mapRequestToEmployee(request, employee);

        // User bog'lanishni yangilash
        if (request.getUserId() != null) {
            if (employee.getUser() == null || !employee.getUser().getId().equals(request.getUserId())) {
                // Tekshirish: user boshqa xodimga bog'langanmi
                if (employeeRepository.existsByUserIdAndIdNot(request.getUserId(), id)) {
                    throw new BadRequestException("Bu foydalanuvchi boshqa xodimga bog'langan");
                }
                linkUserToEmployee(employee, request.getUserId());
            }
        } else {
            employee.setUser(null);
        }

        Employee savedEmployee = employeeRepository.save(employee);
        return EmployeeResponse.from(savedEmployee);
    }

    @Transactional
    public void deleteEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xodim", "id", id));
        employee.setStatus(EmployeeStatus.TERMINATED);
        employeeRepository.save(employee);
    }

    public List<EmployeeResponse> getEmployeesByStatus(EmployeeStatus status) {
        return employeeRepository.findByStatus(status).stream()
                .map(EmployeeResponse::from)
                .collect(Collectors.toList());
    }

    public List<EmployeeResponse> getEmployeesByDepartment(String department) {
        return employeeRepository.findByDepartment(department).stream()
                .map(EmployeeResponse::from)
                .collect(Collectors.toList());
    }

    public List<String> getAllDepartments() {
        return employeeRepository.findAllDepartments();
    }

    public List<User> getAvailableUsers() {
        List<Long> linkedUserIds = employeeRepository.findAll().stream()
                .filter(e -> e.getUser() != null)
                .map(e -> e.getUser().getId())
                .collect(Collectors.toList());

        return userRepository.findByActiveTrue().stream()
                .filter(user -> !linkedUserIds.contains(user.getId()))
                .collect(Collectors.toList());
    }

    private void mapRequestToEmployee(EmployeeRequest request, Employee employee) {
        employee.setFullName(request.getFullName());
        employee.setPhone(request.getPhone());
        employee.setEmail(request.getEmail());
        employee.setPosition(request.getPosition());
        employee.setDepartment(request.getDepartment());
        employee.setSalary(request.getSalary());
        employee.setHireDate(request.getHireDate());
        employee.setStatus(request.getStatus() != null ? request.getStatus() : EmployeeStatus.ACTIVE);
        employee.setBirthDate(request.getBirthDate());
        employee.setPassportNumber(request.getPassportNumber());
        employee.setAddress(request.getAddress());
        employee.setBankAccountNumber(request.getBankAccountNumber());
        employee.setEmergencyContactName(request.getEmergencyContactName());
        employee.setEmergencyContactPhone(request.getEmergencyContactPhone());
    }

    private void linkUserToEmployee(Employee employee, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userId));
        employee.setUser(user);
    }
}
