package uz.shinamagazin.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.shinamagazin.api.dto.response.ApiResponse;
import uz.shinamagazin.api.dto.response.ChartDataResponse;
import uz.shinamagazin.api.dto.response.DashboardStatsResponse;
import uz.shinamagazin.api.service.DashboardService;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard API")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard stats", description = "Dashboard statistikasi")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getStats()));
    }

    @GetMapping("/charts")
    @Operation(summary = "Get chart data", description = "Grafiklar uchun ma'lumotlar (sotuvlar trendi, top mahsulotlar, to'lov usullari va h.k.)")
    public ResponseEntity<ApiResponse<ChartDataResponse>> getChartData(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getChartData(days)));
    }
}
