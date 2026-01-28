package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.EmployeeRequest;
import uz.shinamagazin.api.dto.response.CredentialsInfo;
import uz.shinamagazin.api.dto.response.EmployeeResponse;
import uz.shinamagazin.api.entity.Employee;
import uz.shinamagazin.api.entity.RoleEntity;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.enums.EmployeeStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.EmployeeRepository;
import uz.shinamagazin.api.repository.RoleRepository;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeService {

    private static final String DEFAULT_ROLE_CODE = "SELLER";

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserService userService;
    private final PermissionService permissionService;
    private final NotificationDispatcher notificationDispatcher;

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

        CredentialsInfo newCredentials = null;

        // Handle user account creation
        if (Boolean.TRUE.equals(request.getCreateUserAccount())) {
            // Create user for employee
            String roleCode = request.getRoleCode() != null ? request.getRoleCode() : DEFAULT_ROLE_CODE;
            newCredentials = userService.createUserForEmployee(employee, roleCode);

            // Link the created user to employee
            User createdUser = userService.getUserByUsername(newCredentials.getUsername());
            employee.setUser(createdUser);

            log.info("Created user account for employee: {} with username: {}",
                    employee.getFullName(), newCredentials.getUsername());
        } else if (request.getUserId() != null) {
            // Link existing user to employee
            linkUserToEmployee(employee, request.getUserId());
        }

        Employee savedEmployee = employeeRepository.save(employee);
        EmployeeResponse response = EmployeeResponse.from(savedEmployee);

        // Include credentials in response (one-time display)
        response.setNewCredentials(newCredentials);

        return response;
    }

    @Transactional
    public EmployeeResponse updateEmployee(Long id, EmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xodim", "id", id));

        // Validates phone number is unique before update
        if (!employee.getPhone().equals(request.getPhone()) &&
                employeeRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Bu telefon raqam allaqachon ro'yxatdan o'tgan: " + request.getPhone());
        }

        mapRequestToEmployee(request, employee);

        CredentialsInfo newCredentials = null;

        // Handle user account creation or linking
        if (Boolean.TRUE.equals(request.getCreateUserAccount()) && employee.getUser() == null) {
            // Create new user for employee (only if doesn't have one yet)
            String roleCode = request.getRoleCode() != null ? request.getRoleCode() : DEFAULT_ROLE_CODE;
            newCredentials = userService.createUserForEmployee(employee, roleCode);

            // Link the created user to employee
            User createdUser = userService.getUserByUsername(newCredentials.getUsername());
            employee.setUser(createdUser);

            log.info("Created user account for existing employee: {} with username: {}",
                    employee.getFullName(), newCredentials.getUsername());
        } else if (request.getUserId() != null) {
            // Link existing user
            if (employee.getUser() == null || !employee.getUser().getId().equals(request.getUserId())) {
                // Tekshirish: user boshqa xodimga bog'langanmi
                if (employeeRepository.existsByUserIdAndIdNot(request.getUserId(), id)) {
                    throw new BadRequestException("Bu foydalanuvchi boshqa xodimga bog'langan");
                }
                linkUserToEmployee(employee, request.getUserId());
            }
        } else if (!Boolean.TRUE.equals(request.getCreateUserAccount())) {
            // Only unlink if not trying to create new user
            employee.setUser(null);
        }

        Employee savedEmployee = employeeRepository.save(employee);
        EmployeeResponse response = EmployeeResponse.from(savedEmployee);

        // Include credentials in response (one-time display)
        response.setNewCredentials(newCredentials);

        return response;
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

    /**
     * Change the role of an employee's linked user account.
     * This is an HR operation, separate from system user management.
     *
     * @param employeeId the employee ID
     * @param roleCode the new role code
     * @return updated employee response
     */
    @Transactional
    public EmployeeResponse changeEmployeeRole(Long employeeId, String roleCode) {
        // 1. Find employee
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Xodim", "id", employeeId));

        // 2. Check if employee has linked user account
        if (employee.getUser() == null) {
            throw new BadRequestException("Xodimning tizim akkounti yo'q. Avval akkount yarating.");
        }

        // 3. Find the new role
        RoleEntity newRole = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", "code", roleCode));

        // 4. Check if role is active
        if (!Boolean.TRUE.equals(newRole.getIsActive())) {
            throw new BadRequestException("Bu rol faol emas: " + newRole.getName());
        }

        // 5. Clear existing roles and assign new one
        User user = employee.getUser();
        user.getRoles().clear();
        user.getRoles().add(newRole);

        // Also update legacy role field for backward compatibility
        try {
            user.setRole(uz.shinamagazin.api.enums.Role.valueOf(roleCode));
        } catch (IllegalArgumentException e) {
            // Custom role, not in legacy enum - leave as is
            log.debug("Role {} is not in legacy enum, skipping legacy field update", roleCode);
        }

        userRepository.save(user);

        // 6. Clear permission cache for this user
        permissionService.clearUserPermissionsCache(user.getId());

        // 7. Notify user of role change
        Set<String> permissions = permissionService.getUserPermissionCodes(user.getId());
        Set<String> roles = userService.getUserRoles(user.getId());

        notificationDispatcher.notifyPermissionsUpdated(
                user.getId(),
                permissions,
                roles,
                String.format("Rol '%s' ga HR tomonidan o'zgartirildi", newRole.getName())
        );

        log.info("Changed role for employee {} (user: {}) to {}",
                employee.getFullName(), user.getUsername(), roleCode);

        return EmployeeResponse.from(employee);
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
