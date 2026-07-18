package uz.shinamagazin.api.enums;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ShopOrderEnumTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deliveryMethodAcceptsLowerAndUpperCase() throws Exception {
        assertEquals(ShopDeliveryMethod.DELIVERY,
                objectMapper.readValue("\"delivery\"", ShopDeliveryMethod.class));
        assertEquals(ShopDeliveryMethod.PICKUP,
                objectMapper.readValue("\"PICKUP\"", ShopDeliveryMethod.class));
    }

    @Test
    void paymentMethodAcceptsLowerAndUpperCase() throws Exception {
        assertEquals(ShopPaymentMethod.CASH,
                objectMapper.readValue("\"cash\"", ShopPaymentMethod.class));
        assertEquals(ShopPaymentMethod.PAYME,
                objectMapper.readValue("\"PAYME\"", ShopPaymentMethod.class));
    }

    @Test
    void unknownValueIsRejected() {
        assertThrows(Exception.class,
                () -> objectMapper.readValue("\"crypto\"", ShopPaymentMethod.class));
    }
}
