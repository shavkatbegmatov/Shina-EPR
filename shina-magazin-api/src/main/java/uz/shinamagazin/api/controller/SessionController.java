package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.request.RevokeSessionRequest;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.SessionResponse;
import uz.shinamagazin.api.entity.Session;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.service.SessionService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Session Management", description = "Manage user login sessions")
public class SessionController {

    private final SessionService sessionService;

    @GetMapping("/validate")
    @Operation(summary = "Validate Current Session", description = "Check if current session is still valid")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> validateCurrentSession(
            @RequestHeader("Authorization") String authHeader) {

        String currentToken = authHeader.substring(7); // Remove "Bearer "
        boolean isValid = sessionService.isSessionValid(currentToken);

        Map<String, Boolean> response = Map.of("valid", isValid);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    @Operation(summary = "Get Active Sessions", description = "Get all active sessions for current user")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> getActiveSessions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader("Authorization") String authHeader) {

        Long userId = userDetails.getUser().getId();
        String currentToken = authHeader.substring(7); // Remove "Bearer "
        String currentTokenHash = hashToken(currentToken);

        List<Session> sessions = sessionService.getActiveSessions(userId);

        List<SessionResponse> response = sessions.stream()
                .map(session -> SessionResponse.from(
                    session,
                    session.getTokenHash().equals(currentTokenHash)
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{sessionId}")
    @Operation(summary = "Revoke Session", description = "Logout from a specific session")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) RevokeSessionRequest request) {

        Long userId = userDetails.getUser().getId();
        String reason = request != null && request.getReason() != null
                ? request.getReason()
                : "Logged out by user";

        sessionService.revokeSession(sessionId, userId, reason);

        return ResponseEntity.ok(ApiResponse.success("Session muvaffaqiyatli tugatildi"));
    }

    @DeleteMapping("/revoke-all")
    @Operation(summary = "Revoke All Other Sessions", description = "Logout from all devices except current")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> revokeAllOtherSessions(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestHeader("Authorization") String authHeader) {

        Long userId = userDetails.getUser().getId();
        String currentToken = authHeader.substring(7);

        // Get current session ID to exclude it
        Session currentSession = sessionService.getSessionByToken(currentToken)
                .orElseThrow(() -> new ResourceNotFoundException("Current session not found"));

        int revokedCount = sessionService.revokeAllSessionsExcept(userId, currentSession.getId());

        Map<String, Integer> result = Map.of("revokedCount", revokedCount);
        return ResponseEntity.ok(ApiResponse.success("Boshqa qurilmalardagi sessionlar tugatildi", result));
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    private String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder(2 * hash.length);
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
