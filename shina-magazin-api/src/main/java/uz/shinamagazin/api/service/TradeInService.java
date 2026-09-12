package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.TradeInItemRequest;
import uz.shinamagazin.api.dto.request.TradeInRequest;
import uz.shinamagazin.api.dto.response.TradeInResponse;
import uz.shinamagazin.api.entity.*;
import uz.shinamagazin.api.enums.MovementType;
import uz.shinamagazin.api.enums.TradeInStatus;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.CustomerRepository;
import uz.shinamagazin.api.repository.ProductRepository;
import uz.shinamagazin.api.repository.StockMovementRepository;
import uz.shinamagazin.api.repository.TradeInRepository;
import uz.shinamagazin.api.repository.UserRepository;
import uz.shinamagazin.api.security.CustomUserDetails;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Barter hujjati — mijozdan eski shinalarni qabul qilish va baholash.
 *
 * <p>Oqim: mijoz eski shinalarini olib keladi, kassir ularni baholaydi
 * (masalan 4 × 150 000), yangi shina narxidan shu kredit ayiriladi
 * (4 000 000 − 600 000 = 3 400 000 to'lanadi). Ikki yo'l bor:
 * <ul>
 *   <li><b>Savdo ichida</b> (POS): {@link #prepareForSale} savdo saqlanishidan
 *       oldin hujjatni tuzadi (summa to'lov hisobiga kerak),
 *       {@link #attachToSale} savdo saqlangach uni APPLIED qilib omborga
 *       kirim yozadi.</li>
 *   <li><b>Oldindan</b> (Barter sahifasi): {@link #accept} — mijoz shinasini
 *       bugun qoldirib ketadi, hujjat NEW holatda kutadi; keyingi xaridda
 *       kassa uni {@link #findForSale} bilan oladi va {@link #applyToSale}
 *       bilan bog'laydi.</li>
 * </ul>
 *
 * <p>Qabul qilingan shinalar DARHOL omborga kiradi — hujjat savdoda
 * ishlatilishini kutmaydi: shina jismonan do'konda, qoldiq haqiqatni
 * ko'rsatishi kerak. Bir o'lchamdagi eski shinalar bitta B/U kartochkada
 * yig'iladi ({@link UsedProductService}).
 *
 * <p>Tannarx ehtiyotkorlik bilan yoziladi ({@link #blendedCost}): kartochkada
 * tovar bor bo'lsa "oxirgi kirim narxi yutadi" qoidasi xavfli — bitta arzon
 * baholangan shina butun qoldiqning tannarxini tushirib, foyda hisobotini
 * buzardi. Shuning uchun o'rtacha tortilgan tannarx.
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
    private final UsedProductService usedProductService;

    // ─────────────────────────── O'qish ───────────────────────────

    @Transactional(readOnly = true)
    public Page<TradeInResponse> getAll(TradeInStatus status, Long customerId, Pageable pageable) {
        return tradeInRepository.findFiltered(status, customerId, pageable)
                .map(TradeInResponse::from);
    }

    @Transactional(readOnly = true)
    public TradeInResponse getById(Long id) {
        return TradeInResponse.from(findOrThrow(id));
    }

    /** Kassada tanlash uchun: mijozning hali savdoga bog'lanmagan hujjatlari. */
    @Transactional(readOnly = true)
    public List<TradeInResponse> getAvailable(Long customerId) {
        return tradeInRepository.findAvailableForCustomer(customerId).stream()
                .map(TradeInResponse::from)
                .toList();
    }

    // ─────────────────────── Alohida qabul ────────────────────────

    /** Barter sahifasi: mijoz shinasini qoldirib ketadi, xaridni keyin qiladi. */
    @Transactional
    public TradeInResponse accept(TradeInRequest request) {
        User currentUser = getCurrentUser();
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Mijoz", "id", request.getCustomerId()));

        TradeIn tradeIn = build(customer, request.getItems(), request.getNotes(), false, currentUser);
        TradeIn saved = tradeInRepository.save(tradeIn);

        // Kirim hujjat saqlangandan keyin: harakat yozuvi hujjat id'siga bog'lanadi
        receiveIntoStock(saved, currentUser, "Barter qabuli: " + saved.getDocumentNumber());
        return TradeInResponse.from(saved);
    }

    // ─────────────────────── Savdo ichida ─────────────────────────

    /**
     * Savdo ichidagi barter: hujjat tuziladi (B/U kartochkalar hal qilinadi,
     * summa hisoblanadi), lekin hali saqlanmaydi — {@code SaleService} avval
     * to'lovni hisoblab, savdoni saqlaydi, so'ng {@link #attachToSale}.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public TradeIn prepareForSale(Customer customer, List<TradeInItemRequest> items, User currentUser) {
        return build(customer, items, null, true, currentUser);
    }

    /** Savdo saqlangach: hujjat APPLIED holatda saqlanadi, eski shinalar omborga kiradi. */
    @Transactional(propagation = Propagation.MANDATORY)
    public TradeIn attachToSale(TradeIn tradeIn, Sale sale, User currentUser) {
        tradeIn.setStatus(TradeInStatus.APPLIED);
        sale.attachTradeIn(tradeIn);
        TradeIn saved = tradeInRepository.save(tradeIn);
        receiveIntoStock(saved, currentUser,
                "Barter: " + sale.getInvoiceNumber() + " (" + saved.getDocumentNumber() + ")");
        return saved;
    }

    /**
     * Mijoz oldinroq qoldirgan hujjatni savdo uchun oladi.
     *
     * <p>Hujjat faqat BIR MARTA ishlatiladi: NEW bo'lmagani qaytarilsa bitta
     * kredit ikki savdoda ayirilib, do'kon ikki barobar yo'qotardi. Mijoz ham
     * mos kelishi shart — aks holda bir mijozning shinasi boshqasining
     * xaridida hisobga olinib ketardi.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public TradeIn findForSale(Long id, Customer customer) {
        TradeIn tradeIn = findOrThrow(id);
        if (tradeIn.getStatus() != TradeInStatus.NEW) {
            throw new BadRequestException(String.format(
                    "Barter hujjati %s allaqachon ishlatilgan yoki bekor qilingan",
                    tradeIn.getDocumentNumber()));
        }
        if (customer == null || !tradeIn.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException(String.format(
                    "Barter hujjati %s boshqa mijozga (%s) tegishli — savdoda o'sha mijozni tanlang",
                    tradeIn.getDocumentNumber(), tradeIn.getCustomer().getFullName()));
        }
        return tradeIn;
    }

    /** Oldindan qabul qilingan hujjatni savdoga bog'laydi (shinalar allaqachon omborda). */
    @Transactional(propagation = Propagation.MANDATORY)
    public TradeIn applyToSale(TradeIn tradeIn, Sale sale) {
        tradeIn.setStatus(TradeInStatus.APPLIED);
        sale.attachTradeIn(tradeIn);
        return tradeInRepository.save(tradeIn);
    }

    // ──────────────────────── Bekor qilish ────────────────────────

    /**
     * Hujjatni bekor qilish — eski shinalar mijozga qaytariladi, ombor
     * kirimi qaytariladi.
     *
     * <p>Savdoda ishlatilgan hujjatni bekor qilib bo'lmaydi: savdo summasidan
     * ayirilgan kredit yo'qolib, hisob-kitob buzilardi. Avval savdo bekor
     * qilinadi ({@link #reverseForSale}).
     */
    @Transactional
    public TradeInResponse cancel(Long id) {
        TradeIn tradeIn = findOrThrow(id);
        if (tradeIn.getStatus() == TradeInStatus.CANCELLED) {
            throw new BadRequestException("Bu barter hujjati allaqachon bekor qilingan");
        }
        if (tradeIn.getStatus() == TradeInStatus.APPLIED) {
            String invoice = tradeIn.getSale() != null ? " (" + tradeIn.getSale().getInvoiceNumber() + ")" : "";
            throw new BadRequestException(
                    "Savdoda ishlatilgan barterni bekor qilib bo'lmaydi — avval savdoni bekor qiling" + invoice);
        }

        User currentUser = getCurrentUser();
        returnToCustomer(tradeIn, currentUser, "Barter bekor qilindi: " + tradeIn.getDocumentNumber());
        tradeIn.setStatus(TradeInStatus.CANCELLED);
        return TradeInResponse.from(tradeInRepository.save(tradeIn));
    }

    /**
     * Savdo bekor qilinganda chaqiriladi. Hujjatning taqdiri qayerda qabul
     * qilinganiga bog'liq:
     * <ul>
     *   <li>savdo ichida qabul qilingan — hujjat bekor bo'ladi, eski shinalar
     *       mijozga qaytariladi (ular allaqachon sotilgan bo'lsa bekor qilish
     *       to'siladi: ombor manfiyga tushib, ledger buzilardi);</li>
     *   <li>oldindan qabul qilingan — hujjat yana NEW holatga qaytadi: mijozning
     *       krediti saqlanadi, shinalar omborda qolaveradi (mijoz ularni bugun
     *       olib ketmagan). Kerak bo'lsa rahbar hujjatni alohida bekor qiladi.</li>
     * </ul>
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void reverseForSale(Sale sale, User currentUser) {
        for (TradeIn tradeIn : new ArrayList<>(sale.getTradeIns())) {
            if (tradeIn.getStatus() == TradeInStatus.CANCELLED) {
                continue;
            }
            if (tradeIn.isAcceptedInSale()) {
                returnToCustomer(tradeIn, currentUser,
                        "Barter bekor qilindi: " + sale.getInvoiceNumber() + " (" + tradeIn.getDocumentNumber() + ")");
                tradeIn.setStatus(TradeInStatus.CANCELLED);
            } else {
                sale.detachTradeIn(tradeIn);
                tradeIn.setStatus(TradeInStatus.NEW);
            }
            tradeInRepository.save(tradeIn);
        }
    }

    // ────────────────────────── Ichki ─────────────────────────────

    private TradeIn build(Customer customer, List<TradeInItemRequest> items, String notes,
                          boolean acceptedInSale, User currentUser) {
        TradeIn tradeIn = TradeIn.builder()
                .documentNumber(documentNumberService.nextTradeInNumber())
                .customer(customer)
                .acceptedAt(LocalDateTime.now())
                .acceptedInSale(acceptedInSale)
                .status(TradeInStatus.NEW)
                .notes(trimToNull(notes))
                // Ochiq smena bo'lsa hujjat unga bog'lanadi; yo'q bo'lsa qabul to'silmaydi
                .shift(cashShiftService.findOpenShift(currentUser.getId()).orElse(null))
                .createdBy(currentUser)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (TradeInItemRequest item : items) {
            Product usedProduct = usedProductService.resolve(item, currentUser);
            BigDecimal unitValue = nz(item.getUnitValue()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalValue = unitValue.multiply(BigDecimal.valueOf(item.getQuantity()));

            tradeIn.addItem(TradeInItem.builder()
                    .product(usedProduct)
                    .quantity(item.getQuantity())
                    .unitValue(unitValue)
                    .totalValue(totalValue)
                    .description(describe(item))
                    .build());
            total = total.add(totalValue);
        }
        tradeIn.setTotalAmount(total);
        return tradeIn;
    }

    /** Eski shinalar omborga: B/U kartochka qoldig'i oshadi, tannarx qayta hisoblanadi. */
    private void receiveIntoStock(TradeIn tradeIn, User currentUser, String note) {
        for (TradeInItem item : tradeIn.getItems()) {
            Product product = item.getProduct();
            int previousStock = nz(product.getQuantity());
            int newStock = previousStock + item.getQuantity();
            product.setPurchasePrice(blendedCost(product, previousStock, item));
            product.setQuantity(newStock);
            productRepository.save(product);

            stockMovementRepository.save(StockMovement.builder()
                    .product(product)
                    .movementType(MovementType.IN)
                    .quantity(item.getQuantity())
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .referenceType("TRADE_IN")
                    .referenceId(tradeIn.getId())
                    .notes(note + (item.getDescription() != null ? " — " + item.getDescription() : ""))
                    .unitPrice(item.getUnitValue())
                    .createdBy(currentUser)
                    .build());
        }
    }

    /** Eski shinalar mijozga qaytariladi — B/U qoldiq kamayadi. */
    private void returnToCustomer(TradeIn tradeIn, User currentUser, String note) {
        for (TradeInItem item : tradeIn.getItems()) {
            Product product = item.getProduct();
            int previousStock = nz(product.getQuantity());
            int newStock = previousStock - item.getQuantity();
            if (newStock < 0) {
                throw new BadRequestException(String.format(
                        "\"%s\" B/U shinalari allaqachon sotilgan (zaxira: %d) — barterni "
                                + "bekor qilib bo'lmaydi, qaytarishni rasmiylashtiring",
                        product.getName(), previousStock));
            }
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
                    .notes(note)
                    .unitPrice(item.getUnitValue())
                    .createdBy(currentUser)
                    .build());
        }
    }

    /**
     * B/U kartochkaning yangi tannarxi.
     *
     * <p>Kartochka bo'sh (yoki tannarxsiz) bo'lsa — berilgan kredit. Tovar bor
     * bo'lsa o'rtacha tortilgan: {@code (eski_qoldiq × eski_tannarx + soni ×
     * kredit) / (eski_qoldiq + soni)}. Bitta arzon (yoki qimmat) baholangan
     * shina butun qoldiqning tannarxini o'zgartirib, foyda hisobotini
     * buzmasligi kerak.
     */
    static BigDecimal blendedCost(Product product, int previousStock, TradeInItem item) {
        BigDecimal current = product.getPurchasePrice();
        if (previousStock <= 0 || current == null || current.signum() <= 0) {
            return item.getUnitValue();
        }
        BigDecimal existing = current.multiply(BigDecimal.valueOf(previousStock));
        BigDecimal incoming = item.getUnitValue().multiply(BigDecimal.valueOf(item.getQuantity()));
        return existing.add(incoming)
                .divide(BigDecimal.valueOf(previousStock + item.getQuantity()), 2, RoundingMode.HALF_UP);
    }

    /** Chek va ombor izohi uchun: "Michelin, protektor 60%". */
    static String describe(TradeInItemRequest item) {
        List<String> parts = new ArrayList<>();
        if (item.getBrandName() != null && !item.getBrandName().isBlank()) {
            parts.add(item.getBrandName().trim());
        }
        if (item.getCondition() != null && !item.getCondition().isBlank()) {
            parts.add(item.getCondition().trim());
        }
        if (parts.isEmpty()) {
            return null;
        }
        String joined = String.join(", ", parts);
        return joined.length() > 300 ? joined.substring(0, 300) : joined;
    }

    private TradeIn findOrThrow(Long id) {
        return tradeInRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Barter hujjati", "id", id));
    }

    private User getCurrentUser() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder
                .getContext().getAuthentication().getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi", "id", userDetails.getId()));
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
