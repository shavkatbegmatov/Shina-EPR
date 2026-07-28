package uz.shinamagazin.api.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import uz.shinamagazin.api.entity.Customer;
import uz.shinamagazin.api.entity.Product;
import uz.shinamagazin.api.entity.ShopOrder;
import uz.shinamagazin.api.entity.ShopOrderItem;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.ShopOrderRepository;
import uz.shinamagazin.api.service.notify.OrderNotificationService;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShopOrderServiceTest {

    @Mock private ShopOrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private StaffNotificationService staffNotificationService;
    @Mock private OrderNotificationService orderNotificationService;

    @InjectMocks private ShopOrderService service;

    @Test
    void cancellingOrderRestoresReservedStock() {
        Product product = Product.builder().name("Toyo").quantity(3).build();
        ShopOrder order = orderWithItem(ShopOrderStatus.CONFIRMED, product, 2);
        when(orderRepository.findByOrderNo("PR-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(order)).thenReturn(order);

        service.updateStatus("PR-1", ShopOrderStatus.CANCELLED);

        assertEquals(5, product.getQuantity());
        assertEquals(ShopOrderStatus.CANCELLED, order.getStatus());
        verify(productRepository).save(product);
    }

    @Test
    void reopeningCancelledOrderRequiresEnoughStock() {
        Product product = Product.builder().name("Toyo").quantity(1).build();
        ShopOrder order = orderWithItem(ShopOrderStatus.CANCELLED, product, 2);
        when(orderRepository.findByOrderNo("PR-1")).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class,
                () -> service.updateStatus("PR-1", ShopOrderStatus.CONFIRMED));

        assertEquals(1, product.getQuantity());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void customerCanOpenOwnOrderByPhoneWhenOrderHasNoAccount() {
        ShopOrder order = orderWithItem(ShopOrderStatus.NEW, Product.builder().name("Toyo").quantity(3).build(), 1);
        when(orderRepository.findByOrderNo("PR-1")).thenReturn(Optional.of(order));

        // Guest buyurtma (customer null), lekin telefon mos — turli formatda kelsa ham.
        assertEquals("PR-1", service.getCustomerOrder(7L, "90 123 45 67", "PR-1").getOrderNo());
    }

    @Test
    void customerCanOpenOwnOrderLinkedToAccount() {
        ShopOrder order = orderWithItem(ShopOrderStatus.NEW, Product.builder().name("Toyo").quantity(3).build(), 1);
        order.setCustomer(customerWithId(7L));
        order.setCustomerPhone("+998900000000"); // telefon boshqa — bog'lanish customer.id orqali
        when(orderRepository.findByOrderNo("PR-1")).thenReturn(Optional.of(order));

        assertEquals("PR-1", service.getCustomerOrder(7L, "+998901234567", "PR-1").getOrderNo());
    }

    @Test
    void customerCannotOpenSomeoneElsesOrder() {
        ShopOrder order = orderWithItem(ShopOrderStatus.NEW, Product.builder().name("Toyo").quantity(3).build(), 1);
        order.setCustomer(customerWithId(42L));
        when(orderRepository.findByOrderNo("PR-1")).thenReturn(Optional.of(order));

        // 404 — begona buyurtma raqamining mavjudligi oshkor bo'lmasligi kerak.
        assertThrows(ResourceNotFoundException.class,
                () -> service.getCustomerOrder(7L, "+998907654321", "PR-1"));
    }

    private Customer customerWithId(Long id) {
        Customer customer = new Customer();
        customer.setId(id);
        return customer;
    }

    private ShopOrder orderWithItem(ShopOrderStatus status, Product product, int quantity) {
        ShopOrder order = ShopOrder.builder()
                .orderNo("PR-1")
                .status(status)
                .customerName("Test")
                .customerPhone("+998901234567")
                .subtotal(BigDecimal.TEN)
                .deliveryFee(BigDecimal.ZERO)
                .totalAmount(BigDecimal.TEN)
                .build();
        order.addItem(ShopOrderItem.builder()
                .product(product)
                .productName(product.getName())
                .quantity(quantity)
                .unitPrice(BigDecimal.TEN)
                .totalPrice(BigDecimal.TEN)
                .build());
        return order;
    }
}
