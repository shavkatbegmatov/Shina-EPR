package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.LoginAttemptResponse;
import uz.shinamagazin.api.entity.LoginAttempt;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.LoginAttemptService;
import uz.shinamagazin.api.service.export.ExcelExportService;
import uz.shinamagazin.api.service.export.PdfExportService;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/login-activity")
@RequiredArgsConstructor
@Tag(name = "Login Activity", description = "Login activity logs and security monitoring")
public class LoginActivityController {

    private final LoginAttemptService loginAttemptService;
    private final ExcelExportService excelExportService;
    private final PdfExportService pdfExportService;

    @GetMapping
    @Operation(summary = "Get Login Activity", description = "Get login attempt history with filters")
    @PreAuthorize("hasPermission('VIEW_LOGIN_ACTIVITY')")
    public ResponseEntity<ApiResponse<Page<LoginAttemptResponse>>> getLoginActivity(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        LoginAttempt.LoginStatus loginStatus = status != null
                ? LoginAttempt.LoginStatus.valueOf(status.toUpperCase())
                : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<LoginAttempt> attempts = loginAttemptService.getLoginHistory(
                username, loginStatus, ipAddress, fromDate, toDate, pageable
        );

        Page<LoginAttemptResponse> response = attempts.map(LoginAttemptResponse::from);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/my-history")
    @Operation(summary = "Get My Login History", description = "Get login history for current user")
    public ResponseEntity<ApiResponse<Page<LoginAttemptResponse>>> getMyLoginHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String username = userDetails.getUsername();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<LoginAttempt> attempts = loginAttemptService.getLoginHistory(
                username, null, null, null, null, pageable
        );

        Page<LoginAttemptResponse> response = attempts.map(LoginAttemptResponse::from);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/export")
    @Operation(summary = "Export login activity", description = "Kirish tarixini Excel yoki PDF formatida eksport qilish")
    @PreAuthorize("hasPermission('VIEW_LOGIN_ACTIVITY')")
    public ResponseEntity<Resource> exportLoginActivity(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(defaultValue = "excel") String format,
            @RequestParam(defaultValue = "10000") int maxRecords
    ) {
        try {
            LoginAttempt.LoginStatus loginStatus = status != null
                    ? LoginAttempt.LoginStatus.valueOf(status.toUpperCase())
                    : null;

            Pageable pageable = PageRequest.of(0, maxRecords, Sort.by(Sort.Direction.DESC, "createdAt"));

            Page<LoginAttempt> attemptsPage = loginAttemptService.getLoginHistory(
                    username, loginStatus, ipAddress, fromDate, toDate, pageable
            );

            List<LoginAttemptResponse> attempts = attemptsPage.getContent()
                    .stream()
                    .map(LoginAttemptResponse::from)
                    .toList();

            ByteArrayOutputStream outputStream;
            String contentType;
            String filename;

            if ("pdf".equalsIgnoreCase(format)) {
                outputStream = pdfExportService.exportLoginActivity(attempts, "Kirish Tarixi Hisoboti");
                contentType = "application/pdf";
                filename = "login_activity_" + LocalDate.now() + ".pdf";
            } else {
                outputStream = excelExportService.exportLoginActivity(attempts, "Kirish Tarixi Hisoboti");
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "login_activity_" + LocalDate.now() + ".xlsx";
            }

            ByteArrayResource resource = new ByteArrayResource(outputStream.toByteArray());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(resource.contentLength())
                    .body(resource);
        } catch (Exception e) {
            throw new RuntimeException("Eksport qilishda xatolik: " + e.getMessage(), e);
        }
    }
}
