package uz.shinamagazin.api.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.shinamagazin.api.entity.base.BaseEntity;
import uz.shinamagazin.api.enums.ShopDeliveryMethod;
import uz.shinamagazin.api.enums.ShopOrderStatus;
import uz.shinamagazin.api.enums.ShopPaymentMethod;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Storefront (`/magazin`) mijoz buyurtmasi — guest checkout (auth shart emas).
 * ERP `Sale`'dan alohida bounded-context: mijoz aloqasi embed qilingan
 * (Customer FK yo'q), narx serverda hisoblanadi.
 */
@Entity
@Table(name = "shop_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopOrder extends BaseEntity {

    @Column(name = "order_no", nullable = false, unique = true, length = 30)
    private String orderNo;

    // Aloqa (embed)
    @Column(name = "customer_name", nullable = false, length = 120)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 30)
    private String customerPhone;

    @Column(name = "customer_email", length = 120)
    private String customerEmail;

    // Yetkazib berish
    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", nullable = false, length = 20)
    private ShopDeliveryMethod deliveryMethod;

    @Column(name = "delivery_address", length = 300)
    private String deliveryAddress;

    @Column(name = "delivery_note", length = 500)
    private String deliveryNote;

    // To'lov (usul; haqiqiy gateway integratsiyasi keyin)
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private ShopPaymentMethod paymentMethod;

    // Narxlar (serverda hisoblangan)
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ShopOrderStatus status = ShopOrderStatus.NEW;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ShopOrderItem> items = new ArrayList<>();

    public void addItem(ShopOrderItem item) {
        items.add(item);
        item.setOrder(this);
    }
}
