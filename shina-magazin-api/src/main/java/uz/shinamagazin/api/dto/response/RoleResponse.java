package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.RoleEntity;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Boolean isSystem;
    private Boolean isActive;
    private Set<String> permissions;
    private Integer permissionCount;
    private Integer userCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RoleResponse from(RoleEntity role) {
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .code(role.getCode())
                .description(role.getDescription())
                .isSystem(role.getIsSystem())
                .isActive(role.getIsActive())
                .permissions(role.getPermissions().stream()
                        .map(p -> p.getCode())
                        .collect(Collectors.toSet()))
                .permissionCount(role.getPermissions().size())
                .userCount(role.getUsers().size())
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    public static RoleResponse fromWithoutUsers(RoleEntity role) {
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .code(role.getCode())
                .description(role.getDescription())
                .isSystem(role.getIsSystem())
                .isActive(role.getIsActive())
                .permissions(role.getPermissions().stream()
                        .map(p -> p.getCode())
                        .collect(Collectors.toSet()))
                .permissionCount(role.getPermissions().size())
                .userCount(0)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    public static RoleResponse simpleFrom(RoleEntity role) {
        return RoleResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .code(role.getCode())
                .description(role.getDescription())
                .isSystem(role.getIsSystem())
                .isActive(role.getIsActive())
                .permissions(role.getPermissions().stream()
                        .map(p -> p.getCode())
                        .collect(Collectors.toSet()))
                .permissionCount(role.getPermissions().size())
                .build();
    }
}
