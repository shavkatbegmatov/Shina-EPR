package uz.shinamagazin.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemoDataStatusResponse {

    private boolean active;
    private String datasetVersion;
    private LocalDateTime generatedAt;
    private int totalRecords;

    @Builder.Default
    private Map<String, Integer> counts = new LinkedHashMap<>();
}
