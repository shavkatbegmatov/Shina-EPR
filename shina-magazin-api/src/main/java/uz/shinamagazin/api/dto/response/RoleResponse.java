package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.RoleEntity;

import java.time.LocalDateTime;
import java.util.List;
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
    private List<SimpleUserResponse> users;
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

    public static RoleResponse fromWithUserCount(RoleEntity role, Long userCount) {
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
                .userCount(userCount != null ? userCount.intValue() : 0)
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }

    public static RoleResponse fromWithUsers(RoleEntity role, Long userCount) {
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
                .userCount(userCount != null ? userCount.intValue() : 0)
                .users(role.getUsers() != null
                        ? role.getUsers().stream()
                                .map(SimpleUserResponse::from)
                                .collect(Collectors.toList())
                        : List.of())
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

    public static RoleResponse simpleFromWithUserCount(RoleEntity role, Long userCount) {
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
                .userCount(userCount != null ? userCount.intValue() : 0)
                .build();
    }
}
