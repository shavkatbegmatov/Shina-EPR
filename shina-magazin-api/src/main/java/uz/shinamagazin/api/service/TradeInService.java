package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.TradeInStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Barter: mijozdan eski shinalarni qabul qilish va baholash.
 *
 * <p>Oqim: mijoz eski shinalarini olib keladi, sotuvchi ularni baholaydi
 * (masalan 200 000), va yangi shina narxidan shu baho ayiriladi
 * (900 000 - 200 000 = 700 000 to'lanadi).
 *
 * <p>Qabul qilingan shinalar DARHOL omborga kiradi — hujjat savdoda
 * ishlatilishini kutmaydi. Sababi: shina jismonan do'konda, ombor qoldig'i
 * esa haqiqatni ko'rsatishi kerak. Savdoga bog'lanishi keyin, {@code
 * applyToSale} da bo'ladi.
 *
 * <p>Tannarx ehtiyotkorlik bilan yoziladi: kartochkada tovar bor bo'lsa
 * mavjud tannarx TEGILMAYDI. "Oxirgi kirim narxi yutadi" qoidasi bu yerda
 * xavfli — bitta arzon baholangan shina butun kartochkaning tannarxini
 * tushirib, foyda hisobotini buzardi.
 */
@Service
@RequiredArgsConstructor
public class TradeInService {

    private final TradeInRepository tradeInRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final StockMovementRepository stockMovementRepository;
    private final DocumentNumberService documentNumberService;
    private final CashShiftService cashShiftService;

    @Transactional(readOnly = true)
    public Page<TradeInResponse> getAll(TradeInStatus status, Pageable pageable) {
        Page<TradeIn> page = status != null
                ? tradeInRepository.findByStatus(status, pageable)
                : tradeInRepository.findAll(pageable);
        return page.map(TradeInResponse::from);
    }

    @Transactional(readOnly = true)
    public TradeInResponse getById(Long id) {
        return TradeInResponse.from(findOrThrow(id));
    }

    /** Kassada ishlatish uchun tayyor (hali savdoga bog'lanmagan) barterlar. */
    @Transactional(readOnly = true)
    public List<TradeInResponse> getAvailable(Long customerId) {
        return tradeInRepository.findAvailable(customerId).stream()
                .map(TradeInResponse::from)
                .toList();
    }

    /** Savdoda ishlatish uchun hujjatni olish (holat tekshiruvi applyToSale da). */
    @Transactional(readOnly = true)
    public TradeIn findForSale(Long id) {
        return findOrThrow(id);
    }

    /** Alohida qabul: mijoz shinasini qoldirib ketadi, xaridni keyin qiladi. */
    @Transactional
    public TradeInResponse accept(TradeInRequest request, Long userId) {
        return TradeInResponse.from(acceptInternal(request, userId));
    }

    /**
     * Qabul qilish — savdo ichidan ham chaqiriladi, shuning uchun entity
     * qaytaradi va o'z tranzaksiyasini ochmaydi.
     */
    @Transactional
    public TradeIn acceptInternal(TradeInRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mijoz topilmadi"));
        }

        TradeIn tradeIn = TradeIn.builder()
                .documentNumber(documentNumberService.nextTradeInNumber())
                .customer(customer)
                .acceptedAt(LocalDateTime.now())
                .status(TradeInStatus.NEW)
                .notes(request.getNotes())
                .shift(cashShiftService.findOpenShift(userId).orElse(null))
                .createdBy(user)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (TradeInItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Mahsulot topilmadi: " + itemRequest.getProductId()));

            BigDecimal lineTotal = itemRequest.getUnitValue()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            tradeIn.addItem(TradeInItem.builder()
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .unitValue(itemRequest.getUnitValue())
                    .totalValue(lineTotal)
                    .conditionNote(itemRequest.getConditionNote())
                    .build());

            total = total.add(lineTotal);
        }

        tradeIn.setTotalAmount(total);
        TradeIn saved = tradeInRepository.save(tradeIn);

        // Kirim hujjat saqlangandan keyin: harakat yozuvi hujjat id'siga bog'lanadi
        for (TradeInItem item : saved.getItems()) {
            increaseStock(item, saved, user);
        }

        return saved;
    }

    /**
     * Barterni savdoga bog'lash.
     *
     * <p>Hujjat faqat BIR MARTA ishlatiladi: {@code NEW} bo'lmagani qaytarilsa
     * bitta baho ikki savdoda ayirilib, do'kon ikki barobar yo'qotardi.
     */
    @Transactional
    public TradeIn applyToSale(Long tradeInId, Sale sale) {
        TradeIn tradeIn = findOrThrow(tradeInId);

        if (tradeIn.getStatus() != TradeInStatus.NEW) {
            throw new BadRequestException(
                    "Bu barter allaqachon ishlatilgan yoki bekor qilingan: " + tradeIn.getDocumentNumber());
        }

        // Mijoz mos kelishi shart: aks holda bir mijozning shinasi boshqasining
        // xaridida hisobga olinib ketardi.
        if (tradeIn.getCustomer() != null && sale.getCustomer() != null
                && !tradeIn.getCustomer().getId().equals(sale.getCustomer().getId())) {
            throw new BadRequestException("Barter boshqa mijozga tegishli: " + tradeIn.getDocumentNumber());
        }

        tradeIn.setSale(sale);
        tradeIn.setStatus(TradeInStatus.APPLIED);
        return tradeInRepository.save(tradeIn);
    }

    /**
     * Bekor qilish — omborga qilingan kirim qaytariladi.
     *
     * <p>Savdoda ishlatilgan hujjatni bekor qilib bo'lmaydi: savdo summasidan
     * ayirilgan baho yo'qolib, hisob-kitob buzilardi. Avval savdo bekor
     * qilinadi, u esa barterni o'zi qaytaradi.
     */
    @Transactional
    public TradeInResponse cancel(Long id, Long userId) {
        TradeIn tradeIn = findOrThrow(id);

        if (tradeIn.getStatus() == TradeInStatus.CANCELLED) {
            throw new BadRequestException("Bu barter allaqachon bekor qilingan");
        }
        if (tradeIn.getStatus() == TradeInStatus.APPLIED) {
            throw new BadRequestException(
                    "Savdoda ishlatilgan barterni bekor qilib bo'lmaydi — avval savdoni bekor qiling");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi"));

        reverseStock(tradeIn, user, "Barter bekor qilindi: ");
        tradeIn.setStatus(TradeInStatus.CANCELLED);
        return TradeInResponse.from(tradeInRepository.save(tradeIn));
    }

    /**
     * Savdo bekor qilinganda chaqiriladi: barter hujjati ham bekor bo'ladi va
     * qabul qilingan shinalar ombordan chiqariladi (mijozga qaytariladi).
     */
    @Transactional
    public void reverseForSale(Sale sale, User user) {
        tradeInRepository.findBySaleId(sale.getId()).ifPresent(tradeIn -> {
            if (tradeIn.getStatus() == TradeInStatus.CANCELLED) {
                return;
            }
            reverseStock(tradeIn, user, "Savdo bekor qilindi: ");
            tradeIn.setStatus(TradeInStatus.CANCELLED);
            tradeInRepository.save(tradeIn);
        });
    }

    private void increaseStock(TradeInItem item, TradeIn tradeIn, User user) {
        Product product = item.getProduct();
        int previousStock = product.getQuantity() != null ? product.getQuantity() : 0;
        int newStock = previousStock + item.getQuantity();
        product.setQuantity(newStock);

        // Tannarx faqat kartochka BO'SH bo'lganda yoziladi. Tovar bor bo'lsa
        // tegilmaydi: baholangan bitta shina butun qoldiqning tannarxini
        // o'zgartirib, foyda hisobotini buzardi.
        BigDecimal currentCost = product.getPurchasePrice();
        if (previousStock <= 0 || currentCost == null || currentCost.signum() == 0) {
            product.setPurchasePrice(item.getUnitValue());
        }
        productRepository.save(product);

        stockMovementRepository.save(StockMovement.builder()
                .product(product)
                .movementType(MovementType.IN)
                .quantity(item.getQuantity())
                .previousStock(previousStock)
                .newStock(newStock)
                .referenceType("TRADE_IN")
                .referenceId(tradeIn.getId())
                .unitPrice(item.getUnitValue())
                .notes("Barter qabuli: " + tradeIn.getDocumentNumber())
                .createdBy(user)
                .build());
    }

    private void reverseStock(TradeIn tradeIn, User user, String notePrefix) {
        for (TradeInItem item : tradeIn.getItems()) {
            Product product = item.getProduct();
            int previousStock = product.getQuantity() != null ? product.getQuantity() : 0;
            int newStock = previousStock - item.getQuantity();
            product.setQuantity(newStock);
            productRepository.save(product);

            stockMovementRepository.save(StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.OUT)
                    .quantity(-item.getQuantity())
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .referenceType("TRADE_IN_CANCEL")
                    .referenceId(tradeIn.getId())
                    .unitPrice(item.getUnitValue())
                    .notes(notePrefix + tradeIn.getDocumentNumber())
                    .createdBy(user)
                    .build());
        }
    }

    private TradeIn findOrThrow(Long id) {
        return tradeInRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Barter hujjati topilmadi: " + id));
    }
}
