package uz.shinamagazin.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.shinamagazin.api.dto.request.CategoryAttributeBindingRequest;
import uz.shinamagazin.api.dto.request.CategoryRequest;
import uz.shinamagazin.api.dto.response.CategoryAttributeResponse;
import uz.shinamagazin.api.dto.response.CategoryResponse;
import uz.shinamagazin.api.entity.Attribute;
import uz.shinamagazin.api.entity.Category;
import uz.shinamagazin.api.entity.CategoryAttribute;
import uz.shinamagazin.api.exception.BadRequestException;
import uz.shinamagazin.api.exception.ResourceNotFoundException;
import uz.shinamagazin.api.repository.AttributeRepository;
import uz.shinamagazin.api.repository.CategoryAttributeRepository;
import uz.shinamagazin.api.repository.CategoryRepository;
import uz.shinamagazin.api.repository.ProductRepository;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryAttributeRepository categoryAttributeRepository;
    private final AttributeRepository attributeRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        Map<Long, Long> counts = productCounts();
        return categoryRepository.findByActiveTrue().stream()
                .sorted(Comparator.comparing(Category::getSortOrder).thenComparing(Category::getId))
                .map(c -> CategoryResponse.from(c, counts))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategoryTree() {
        Map<Long, Long> counts = productCounts();
        return categoryRepository.findByParentIsNullAndActiveTrue().stream()
                .sorted(Comparator.comparing(Category::getSortOrder).thenComparing(Category::getId))
                .map(c -> CategoryResponse.from(c, counts))
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya", "id", id));
        return CategoryResponse.from(category, productCounts());
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .icon(request.getIcon())
                .active(true)
                .build();

        if (request.getParentId() != null) {
            category.setParent(requireCategory(request.getParentId()));
        }
        category.setSortOrder(request.getSortOrder() != null
                ? request.getSortOrder()
                : nextSortOrder(request.getParentId()));

        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = requireCategory(id);

        category.setName(request.getName().trim());
        category.setDescription(request.getDescription());
        category.setIcon(request.getIcon());
        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }
        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }

        Long parentId = request.getParentId();
        if (parentId == null) {
            category.setParent(null);
        } else if (!parentId.equals(id)) {
            Category parent = requireCategory(parentId);
            // Halqa (cycle) oldini olish: yangi ota — o'zining bolasi bo'lmasin
            if (collectDescendantIds(id).contains(parentId)) {
                throw new BadRequestException("Kategoriyani o'z bolasiga ko'chirib bo'lmaydi");
            }
            category.setParent(parent);
        }

        return CategoryResponse.from(categoryRepository.save(category));
    }

    /** Kategoriya va butun bolalar shajarasini soft-o'chiradi. */
    @Transactional
    public void deleteCategory(Long id) {
        Category category = requireCategory(id);
        Set<Long> subtree = collectDescendantIds(id);
        List<Category> toDeactivate = categoryRepository.findAllById(subtree);
        toDeactivate.forEach(c -> c.setActive(false));
        categoryRepository.saveAll(toDeactivate);
        category.setActive(false);
        categoryRepository.save(category);
    }

    /** Bir ota ichida yuqoriga/pastga siljitish (sort_order almashinuvi). */
    @Transactional
    public List<CategoryResponse> moveCategory(Long id, String direction) {
        Category category = requireCategory(id);
        Long parentId = category.getParent() != null ? category.getParent().getId() : null;

        List<Category> siblings = (parentId == null
                ? categoryRepository.findByParentIsNullAndActiveTrue()
                : categoryRepository.findByParentIdAndActiveTrue(parentId))
                .stream()
                .sorted(Comparator.comparing(Category::getSortOrder).thenComparing(Category::getId))
                .toList();

        int index = -1;
        for (int i = 0; i < siblings.size(); i++) {
            if (siblings.get(i).getId().equals(id)) {
                index = i;
                break;
            }
        }
        int swapWith = "up".equalsIgnoreCase(direction) ? index - 1 : index + 1;
        if (index < 0 || swapWith < 0 || swapWith >= siblings.size()) {
            return getCategoryTree(); // chetda — o'zgarmaydi
        }

        Category a = siblings.get(index);
        Category b = siblings.get(swapWith);
        // sort_order teng bo'lib qolgan eski yozuvlarda ham ishlashi uchun indekslar bo'yicha qayta raqamlaymiz
        List<Category> reordered = new ArrayList<>(siblings);
        reordered.set(index, b);
        reordered.set(swapWith, a);
        for (int i = 0; i < reordered.size(); i++) {
            reordered.get(i).setSortOrder(i);
        }
        categoryRepository.saveAll(reordered);
        return getCategoryTree();
    }

    // ============================================
    // Atribut bog'lanishlari
    // ============================================

    /**
     * Kategoriyaning effektiv atributlari: o'ziniki + barcha ota kategoriyalarniki
     * (meros). Bir xil atribut ikki joyda bo'lsa, eng yaqin (pastki) g'olib.
     */
    @Transactional(readOnly = true)
    public List<CategoryAttributeResponse> getEffectiveAttributes(Long categoryId) {
        Category category = requireCategory(categoryId);

        Map<Long, CategoryAttributeResponse> byAttribute = new LinkedHashMap<>();
        boolean inherited = false;
        Category current = category;
        while (current != null) {
            List<CategoryAttribute> bindings =
                    categoryAttributeRepository.findByCategoryIdWithAttribute(current.getId());
            for (CategoryAttribute binding : bindings) {
                if (!Boolean.TRUE.equals(binding.getAttribute().getActive())) {
                    continue;
                }
                byAttribute.putIfAbsent(
                        binding.getAttribute().getId(),
                        CategoryAttributeResponse.from(binding, inherited));
            }
            current = current.getParent();
            inherited = true;
        }
        return new ArrayList<>(byAttribute.values());
    }

    /** Kategoriyaning O'Z bog'lanishlarini to'liq almashtiradi. */
    @Transactional
    public List<CategoryAttributeResponse> updateCategoryAttributes(
            Long categoryId, List<CategoryAttributeBindingRequest> bindings) {
        Category category = requireCategory(categoryId);

        List<CategoryAttribute> existing =
                categoryAttributeRepository.findByCategoryIdWithAttribute(categoryId);
        Map<Long, CategoryAttribute> existingByAttribute = new HashMap<>();
        existing.forEach(ca -> existingByAttribute.put(ca.getAttribute().getId(), ca));

        Set<Long> requestedIds = new HashSet<>();
        List<CategoryAttribute> toSave = new ArrayList<>();
        int order = 0;
        for (CategoryAttributeBindingRequest binding : bindings) {
            if (!requestedIds.add(binding.getAttributeId())) {
                continue; // dublikat — e'tiborsiz
            }
            CategoryAttribute ca = existingByAttribute.get(binding.getAttributeId());
            if (ca == null) {
                Attribute attribute = attributeRepository.findById(binding.getAttributeId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Atribut", "id", binding.getAttributeId()));
                ca = CategoryAttribute.builder()
                        .category(category)
                        .attribute(attribute)
                        .build();
            }
            ca.setRequired(Boolean.TRUE.equals(binding.getRequired()));
            ca.setSortOrder(binding.getSortOrder() != null ? binding.getSortOrder() : order);
            toSave.add(ca);
            order++;
        }

        List<CategoryAttribute> toDelete = existing.stream()
                .filter(ca -> !requestedIds.contains(ca.getAttribute().getId()))
                .toList();
        categoryAttributeRepository.deleteAll(toDelete);
        categoryAttributeRepository.saveAll(toSave);

        return getEffectiveAttributes(categoryId);
    }

    // ============================================
    // Umumiy yordamchilar (boshqa servicelar ham ishlatadi)
    // ============================================

    /** Kategoriya + barcha (faol) avlodlari id'lari — filtrlarda subtree qidiruv uchun. */
    @Transactional(readOnly = true)
    public Set<Long> collectDescendantIds(Long rootId) {
        Set<Long> ids = new HashSet<>();
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(rootId);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (!ids.add(current)) {
                continue;
            }
            categoryRepository.findByParentIdAndActiveTrue(current)
                    .forEach(child -> queue.add(child.getId()));
        }
        return ids;
    }

    private Category requireCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya", "id", id));
    }

    private int nextSortOrder(Long parentId) {
        List<Category> siblings = parentId == null
                ? categoryRepository.findByParentIsNullAndActiveTrue()
                : categoryRepository.findByParentIdAndActiveTrue(parentId);
        return siblings.stream().mapToInt(Category::getSortOrder).max().orElse(-1) + 1;
    }

    private Map<Long, Long> productCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : productRepository.countActiveByCategory()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }
}
