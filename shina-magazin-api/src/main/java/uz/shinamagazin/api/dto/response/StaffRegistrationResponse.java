package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.shinamagazin.api.entity.StaffRegistrationRequest;
import uz.shinamagazin.api.enums.StaffRegistrationStatus;

import java.time.LocalDateTime;

/** Xodimlikka ro'yxatdan o'tish so'rovi — adminka ro'yxati uchun. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffRegistrationResponse {

    private Long id;
    private String fullName;
    private String phone;
    private String companyName;
    /** So'rovchi taklif qilgan rol — yakuniy qaror emas. */
    private String requestedRole;
    private String note;
    private StaffRegistrationStatus status;
    private LocalDateTime createdAt;

    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String rejectReason;
    /** Tasdiqlangach yaratilgan xodim. */
    private Long employeeId;

    public static StaffRegistrationResponse from(StaffRegistrationRequest request) {
        return StaffRegistrationResponse.builder()
                .id(request.getId())
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .companyName(request.getCompanyName())
                .requestedRole(request.getRequestedRole())
                .note(request.getNote())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                // LAZY proksilarga ehtiyotkorlik bilan tegamiz: ro'yxat
                // so'rovida bular default_batch_fetch_size bilan to'planadi.
                .reviewedByName(request.getReviewedBy() != null ? request.getReviewedBy().getFullName() : null)
                .reviewedAt(request.getReviewedAt())
                .rejectReason(request.getRejectReason())
                .employeeId(request.getEmployee() != null ? request.getEmployee().getId() : null)
                // clientIp ATAYLAB qaytarilmaydi — u ichki tekshiruv uchun,
                // xodimga kerak emas va shaxsiy ma'lumot hisoblanadi.
                .build();
    }
}
