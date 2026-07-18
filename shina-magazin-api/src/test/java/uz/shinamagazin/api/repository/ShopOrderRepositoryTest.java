package uz.shinamagazin.api.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.enums.ShopDeliveryMethod;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.enums.ShopPaymentMethod;
import uz.shinamagazin.api.repository.specification.ShopOrderSpecifications;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false, properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:shop-orders;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=false;NON_KEYWORDS=VALUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.cloud.vault.enabled=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ShopOrderRepositoryTest {

    @Autowired
    private ShopOrderRepository repository;

    @Test
    void listsOrdersWhenEveryFilterIsAbsent() {
        repository.saveAndFlush(order("PR-NEWEST", "Test Mijoz", ShopOrderStatus.NEW));

        Page<ShopOrder> result = repository.findAll(
                ShopOrderSpecifications.withFilters(null, null, null, null),
                PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(ShopOrder::getOrderNo)
                .containsExactly("PR-NEWEST");
    }

    @Test
    void combinesStatusAndCaseInsensitiveSearch() {
        repository.save(order("PR-MATCH", "Test Mijoz", ShopOrderStatus.NEW));
        repository.save(order("PR-OTHER", "Boshqa mijoz", ShopOrderStatus.CONFIRMED));
        repository.flush();

        Page<ShopOrder> result = repository.findAll(
                ShopOrderSpecifications.withFilters(ShopOrderStatus.NEW, null, null, "test"),
                PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(ShopOrder::getOrderNo)
                .containsExactly("PR-MATCH");
    }

    @Test
    void findsGuestOrderByCustomerPhoneWithoutDroppingNullCustomerAssociation() {
        repository.saveAndFlush(order("PR-GUEST", "Guest Mijoz", ShopOrderStatus.NEW));

        Page<ShopOrder> result = repository.findAll(
                ShopOrderSpecifications.withFilters(
                        null, 999L, "+998901234567", null),
                PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).extracting(ShopOrder::getOrderNo)
                .containsExactly("PR-GUEST");
    }

    private ShopOrder order(String orderNo, String customerName, ShopOrderStatus status) {
        return ShopOrder.builder()
                .orderNo(orderNo)
                .customerName(customerName)
                .customerPhone("+998901234567")
                .deliveryMethod(ShopDeliveryMethod.DELIVERY)
                .paymentMethod(ShopPaymentMethod.CASH)
                .status(status)
                .subtotal(BigDecimal.valueOf(650_000))
                .deliveryFee(BigDecimal.valueOf(30_000))
                .totalAmount(BigDecimal.valueOf(680_000))
                .build();
    }
}
