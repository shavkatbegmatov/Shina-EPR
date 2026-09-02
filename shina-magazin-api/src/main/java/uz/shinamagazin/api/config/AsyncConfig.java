package uz.shinamagazin.api.config;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
import java.util.concurrent.Executor;

/**
 * {@code @Async} vazifalar (audit jurnali, bildirishnomalar) uchun ANIQ executor.
 *
 * <p>Ilgari nomlangan executor yo'q edi: Spring startup'da "More than one TaskExecutor
 * bean found ... none is named 'taskExecutor'" deb ogohlantirar va {@code @Async}
 * uchun {@code SimpleAsyncTaskExecutor} ishlatardi — u HAR chaqiruv uchun yangi oqim
 * ochadi (chegarasiz) va ilova to'xtaganda navbatdagi vazifalarni kutmaydi. Audit
 * yozuvi biznes o'zgarishi commit bo'lgandan KEYIN yoziladi, ya'ni deploy paytida
 * to'xtash oxirgi bir necha audit yozuvini jimgina yo'qotardi.
 *
 * <p>Endi: chegaralangan pool, to'xtashda 20 s gacha navbat bo'shatiladi (Spring
 * lifecycle bilan bir xil), so'rovning correlation ID'si (MDC) oqimga ko'chiriladi,
 * ushlanmagan istisnolar jimgina yo'qolmaydi.
 */
@Configuration
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

    @Bean(name = "taskExecutor")
    public ThreadPoolTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("async-");
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(1000);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        // So'rov oqimidagi MDC (correlationId) async oqimga ham o'tsin — loglar bog'lansin
        executor.setTaskDecorator(task -> {
            Map<String, String> context = MDC.getCopyOfContextMap();
            return () -> {
                Map<String, String> previous = MDC.getCopyOfContextMap();
                if (context != null) {
                    MDC.setContextMap(context);
                } else {
                    MDC.clear();
                }
                try {
                    task.run();
                } finally {
                    if (previous != null) {
                        MDC.setContextMap(previous);
                    } else {
                        MDC.clear();
                    }
                }
            };
        });
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return taskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
                log.error("Async vazifa xatosi: {}.{}", method.getDeclaringClass().getSimpleName(), method.getName(), ex);
    }
}
