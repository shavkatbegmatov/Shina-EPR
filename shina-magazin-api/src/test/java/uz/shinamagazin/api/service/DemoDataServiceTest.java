package uz.shinamagazin.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;
import uz.shinamagazin.api.dto.response.DemoDataStatusResponse;
import uz.shinamagazin.api.entity.User;
import uz.shinamagazin.api.repository.UserRepository;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoDataServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private UserRepository userRepository;
    @Mock private DemoDataScriptRunner scriptRunner;

    private DemoDataService service;

    @BeforeEach
    void setUp() {
        service = new DemoDataService(jdbcTemplate, userRepository, scriptRunner);
    }

    @Test
    void generateCleansAndSeedsInOneDeterministicOrder() {
        User actor = new User();
        actor.setId(17L);
        DemoDataStatusResponse status = DemoDataStatusResponse.builder()
                .active(true)
                .datasetVersion("2.0")
                .totalRecords(42)
                .counts(Map.of("products", 12))
                .build();

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(actor));
        when(jdbcTemplate.queryForObject(
                contains("set_config"),
                eq(String.class),
                any(Object.class))).thenReturn("17");
        when(jdbcTemplate.queryForObject(
                contains("COUNT(DISTINCT sale.id)"),
                eq(Integer.class))).thenReturn(0);
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class))).thenReturn(status);

        DemoDataStatusResponse result = service.generate("admin");

        assertSame(status, result);
        InOrder scripts = inOrder(scriptRunner);
        scripts.verify(scriptRunner).execute("db/demo/demo-cleanup.sql");
        scripts.verify(scriptRunner).execute("db/demo/demo-seed.sql");
        verify(userRepository).findByUsername("admin");
    }

    @Test
    void removeNeverRunsTheSeedScript() {
        DemoDataStatusResponse status = DemoDataStatusResponse.builder()
                .active(false)
                .datasetVersion("2.0")
                .totalRecords(0)
                .build();
        when(jdbcTemplate.queryForObject(
                contains("COUNT(DISTINCT sale.id)"),
                eq(Integer.class))).thenReturn(0);
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class))).thenReturn(status);

        DemoDataStatusResponse result = service.remove();

        assertSame(status, result);
        verify(scriptRunner).execute("db/demo/demo-cleanup.sql");
    }

    @Test
    void removeRefusesToDeleteDemoObjectsUsedByRegularDocuments() {
        when(jdbcTemplate.queryForObject(
                contains("COUNT(DISTINCT sale.id)"),
                eq(Integer.class))).thenReturn(2);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, service::remove);
        assertTrue(exception.getReason().contains("2 ta oddiy hujjat"));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sql.capture(), eq(Integer.class));
        assertTrue(sql.getValue().contains("HNK-VP3-2155516"));
        assertTrue(sql.getValue().contains("movement.product_id IN (SELECT id FROM demo_products)"));
        assertTrue(sql.getValue().contains("movement.reference_type IS DISTINCT FROM 'DEMO_SEED'"));
        verifyNoInteractions(scriptRunner);
    }
}
