package uz.shinamagazin.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(String productName, int available, int requested) {
        super(String.format("'%s' mahsulotidan yetarli miqdor yo'q. Mavjud: %d, So'ralgan: %d",
                productName, available, requested));
    }
}
