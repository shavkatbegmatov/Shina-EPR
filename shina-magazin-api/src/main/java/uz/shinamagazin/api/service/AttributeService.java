package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.AttributeRequest;
import uz.shinamagazin.api.dto.response.AttributeResponse;
import uz.shinamagazin.api.entity.Attribute;
import uz.shinamagazin.api.entity.AttributeOption;
import uz.shinamagazin.api.enums.AttributeType;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.AttributeRepository;
import uz.shinamagazin.api.repository.CategoryAttributeRepository;
import uz.shinamagazin.api.repository.ProductAttributeValueRepository;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AttributeService {

    private final AttributeRepository attributeRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final ProductAttributeValueRepository valueRepository;

    @Transactional(readOnly = true)
    public List<AttributeResponse> getAllAttributes() {
        return attributeRepository.findAllActiveWithOptions().stream()
                .map(a -> AttributeResponse.from(
                        a,
                        categoryAttributeRepository.countByAttributeId(a.getId()),
                        valueRepository.countByAttributeId(a.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public AttributeResponse getAttributeById(Long id) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atribut", "id", id));
        return AttributeResponse.from(
                attribute,
                categoryAttributeRepository.countByAttributeId(id),
                valueRepository.countByAttributeId(id));
    }

    @Transactional
    public AttributeResponse createAttribute(AttributeRequest request) {
        String code = normalizeCode(request.getCode(), request.getName());
        if (attributeRepository.existsByCode(code)) {
            throw new BadRequestException("Bu kod allaqachon mavjud: " + code);
        }
        validateOptions(request);

        Attribute attribute = Attribute.builder()
                .name(request.getName().trim())
                .code(code)
                .type(request.getType())
                .unit(blankToNull(request.getUnit()))
                .filterable(request.getFilterable() == null || request.getFilterable())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .active(true)
                .build();

        applyOptions(attribute, request);
        return AttributeResponse.from(attributeRepository.save(attribute), 0L, 0L);
    }

    @Transactional
    public AttributeResponse updateAttribute(Long id, AttributeRequest request) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atribut", "id", id));

        long valueCount = valueRepository.countByAttributeId(id);
        if (request.getType() != null && request.getType() != attribute.getType() && valueCount > 0) {
            throw new BadRequestException(
                    "Bu atribut " + valueCount + " ta mahsulotda ishlatilgan — turini o'zgartirib bo'lmaydi");
        }

        String code = normalizeCode(request.getCode(), request.getName());
        if (!attribute.getCode().equals(code) && attributeRepository.existsByCode(code)) {
            throw new BadRequestException("Bu kod allaqachon mavjud: " + code);
        }
        validateOptions(request);

        attribute.setName(request.getName().trim());
        attribute.setCode(code);
        attribute.setType(request.getType());
        attribute.setUnit(blankToNull(request.getUnit()));
        if (request.getFilterable() != null) {
            attribute.setFilterable(request.getFilterable());
        }
        if (request.getSortOrder() != null) {
            attribute.setSortOrder(request.getSortOrder());
        }

        applyOptions(attribute, request);
        return AttributeResponse.from(
                attributeRepository.save(attribute),
                categoryAttributeRepository.countByAttributeId(id),
                valueCount);
    }

    @Transactional
    public void deleteAttribute(Long id) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atribut", "id", id));
        attribute.setActive(false);
        attributeRepository.save(attribute);
    }

    // ============================================
    // Ichki yordamchilar
    // ============================================

    /** Variantlar faqat SELECT/MULTI_SELECT uchun; dublikat qiymatlar taqiqlanadi. */
    private void validateOptions(AttributeRequest request) {
        boolean selectable = request.getType() == AttributeType.SELECT
                || request.getType() == AttributeType.MULTI_SELECT;
        if (!selectable) {
            return;
        }
        if (request.getOptions() == null || request.getOptions().isEmpty()) {
            throw new BadRequestException("Tanlov turidagi atribut kamida bitta variantga ega bo'lishi kerak");
        }
        Set<String> seen = new HashSet<>();
        for (AttributeRequest.OptionRequest option : request.getOptions()) {
            if (!seen.add(option.getValue().trim().toLowerCase(Locale.ROOT))) {
                throw new BadRequestException("Variant takrorlangan: " + option.getValue());
            }
        }
    }

    /**
     * Variantlar ro'yxatini so'rov bo'yicha moslashtiradi: id kelganlar yangilanadi,
     * yangilari qo'shiladi; ro'yxatda yo'q eski variant mahsulotlarda ishlatilgan
     * bo'lsa soft-o'chiriladi (active=false), aks holda butunlay o'chiriladi.
     */
    private void applyOptions(Attribute attribute, AttributeRequest request) {
        boolean selectable = request.getType() == AttributeType.SELECT
                || request.getType() == AttributeType.MULTI_SELECT;

        List<AttributeRequest.OptionRequest> requested =
                selectable && request.getOptions() != null ? request.getOptions() : List.of();

        Map<Long, AttributeRequest.OptionRequest> requestedById = new HashMap<>();
        for (AttributeRequest.OptionRequest option : requested) {
            if (option.getId() != null) {
                requestedById.put(option.getId(), option);
            }
        }

        // Mavjudlarni yangilash / ortiqchalarini olib tashlash
        attribute.getOptions().removeIf(existing -> {
            AttributeRequest.OptionRequest match = requestedById.get(existing.getId());
            if (match != null) {
                existing.setValue(match.getValue().trim());
                existing.setSortOrder(match.getSortOrder() != null ? match.getSortOrder() : 0);
                existing.setActive(true);
                return false;
            }
            if (existing.getId() != null && valueRepository.countByOptionId(existing.getId()) > 0) {
                existing.setActive(false); // ishlatilgan variant — tarix uchun saqlanadi
                return false;
            }
            return true; // ishlatilmagan variant — o'chiriladi (orphanRemoval)
        });

        // Yangilarini qo'shish
        for (AttributeRequest.OptionRequest option : requested) {
            if (option.getId() != null) {
                continue;
            }
            String value = option.getValue().trim();
            boolean exists = attribute.getOptions().stream()
                    .anyMatch(o -> o.getValue().equalsIgnoreCase(value));
            if (exists) {
                // Soft-o'chirilgan variant qayta kiritilsa — tiklaymiz
                attribute.getOptions().stream()
                        .filter(o -> o.getValue().equalsIgnoreCase(value))
                        .forEach(o -> {
                            o.setActive(true);
                            o.setSortOrder(option.getSortOrder() != null ? option.getSortOrder() : 0);
                        });
                continue;
            }
            attribute.getOptions().add(AttributeOption.builder()
                    .attribute(attribute)
                    .value(value)
                    .sortOrder(option.getSortOrder() != null ? option.getSortOrder() : 0)
                    .active(true)
                    .build());
        }
    }

    /** Kod berilmasa nomdan slug yasaydi (kirill/lotin -> a-z0-9_). */
    static String normalizeCode(String code, String name) {
        String source = code != null && !code.isBlank() ? code : name;
        String normalized = Normalizer.normalize(source, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace("o'", "o").replace("g'", "g").replace("ʻ", "").replace("'", "")
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.isBlank()) {
            throw new BadRequestException("Atribut kodi yaroqsiz — lotin harflarida kiriting");
        }
        return normalized.length() > 60 ? normalized.substring(0, 60) : normalized;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
