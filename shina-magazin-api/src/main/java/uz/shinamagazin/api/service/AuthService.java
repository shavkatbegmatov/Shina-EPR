package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.request.LoginRequest;
import uz.shinamagazin.api.dto.response.JwtResponse;
import uz.shinamagazin.api.dto.response.UserResponse;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;
import uz.shinamagazin.api.security.JwtTokenProvider;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getUser().getId();

        // Generate token with permissions
        String accessToken = tokenProvider.generateStaffTokenWithPermissions(
                userDetails.getUsername(),
                userId,
                userDetails.getRoleCodes(),
                userDetails.getPermissions()
        );
        String refreshToken = tokenProvider.generateStaffRefreshToken(userDetails.getUsername(), userId);

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserResponse.from(userDetails.getUser()))
                .permissions(userDetails.getPermissions())
                .roles(userDetails.getRoleCodes())
                .build();
    }

    public JwtResponse refreshToken(String refreshToken) {
        if (tokenProvider.validateToken(refreshToken)) {
            String username = tokenProvider.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsernameWithRolesAndPermissions(username)
                    .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "username", username));

            CustomUserDetails userDetails = new CustomUserDetails(user);

            String newAccessToken = tokenProvider.generateStaffTokenWithPermissions(
                    username,
                    user.getId(),
                    userDetails.getRoleCodes(),
                    userDetails.getPermissions()
            );
            String newRefreshToken = tokenProvider.generateStaffRefreshToken(username, user.getId());

            return JwtResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .user(UserResponse.from(user))
                    .permissions(userDetails.getPermissions())
                    .roles(userDetails.getRoleCodes())
                    .build();
        }
        throw new RuntimeException("Refresh token yaroqsiz");
    }

    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return UserResponse.from(userDetails.getUser());
    }
}
