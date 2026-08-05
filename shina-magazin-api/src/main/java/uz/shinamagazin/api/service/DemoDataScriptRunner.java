package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/** Executes the PostgreSQL demo scripts on the current transactional connection. */
@Component
@RequiredArgsConstructor
class DemoDataScriptRunner {

    private static final String STATEMENT_SEPARATOR = "@@";

    private final DataSource dataSource;

    void execute(String classpathLocation) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.setSqlScriptEncoding("UTF-8");
        populator.setSeparator(STATEMENT_SEPARATOR);
        populator.setContinueOnError(false);
        populator.setIgnoreFailedDrops(false);
        populator.addScript(new ClassPathResource(classpathLocation));
        populator.execute(dataSource);
    }
}
