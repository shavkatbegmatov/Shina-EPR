package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.annotation.ExportColumn;
import uz.shinamagazin.api.annotation.ExportColumn.ColumnType;
import uz.shinamagazin.api.annotation.ExportEntity;
import uz.shinamagazin.api.entity.RoleEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ExportEntity(sheetName = "Rollar", title = "Rollar Hisoboti")
public class RoleResponse {
    @ExportColumn(header = "ID", order = 1, type = ColumnType.NUMBER)
    private Long id;

    @ExportColumn(header = "Nomi", order = 2)
    private String name;

    @ExportColumn(header = "Kod", order = 3)
    private String code;

    @ExportColumn(header = "Tavsif", order = 4)
    private String description;

    @ExportColumn(header = "Tizim roli", order = 5, type = ColumnType.BOOLEAN)
    private Boolean isSystem;

    @ExportColumn(header = "Faol", order = 6, type = ColumnType.BOOLEAN)
    private Boolean isActive;

    private Set<String> permissions; // Not exported (complex type)

    @ExportColumn(header = "Ruxsatlar soni", order = 7, type = ColumnType.NUMBER)
    private Integer permissionCount;

    @ExportColumn(header = "Foydalanuvchilar soni", order = 8, type = ColumnType.NUMBER)
    private Integer userCount;

    private List<SimpleUserResponse> users; // Not exported (complex type)

    @ExportColumn(header = "Yaratilgan", order = 9, type = ColumnType.DATETIME)
    private LocalDateTime createdAt;

    @ExportColumn(header = "Yangilangan", order = 10, type = ColumnType.DATETIME)
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
