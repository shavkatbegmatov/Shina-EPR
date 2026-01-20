package uz.shinamagazin.api.service;

import org.springframework.stereotype.Service;
import uz.shinamagazin.api.dto.response.AuditLogDetailResponse;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for mapping database field names to Uzbek labels
 * and determining field types for proper formatting
 */
@Service
public class FieldLabelService {

    private final Map<String, Map<String, String>> entityFieldLabels = new HashMap<>();
    private final Map<String, Map<String, AuditLogDetailResponse.FieldType>> entityFieldTypes = new HashMap<>();

    public FieldLabelService() {
        initializeLabels();
        initializeFieldTypes();
    }

    /**
     * Get Uzbek label for field
     */
    public String getFieldLabel(String entityType, String fieldName) {
        return entityFieldLabels
            .getOrDefault(entityType, new HashMap<>())
            .getOrDefault(fieldName, fieldName); // Fallback to field name
    }

    /**
     * Get field type for formatting
     */
    public AuditLogDetailResponse.FieldType getFieldType(String entityType, String fieldName) {
        return entityFieldTypes
            .getOrDefault(entityType, new HashMap<>())
            .getOrDefault(fieldName, AuditLogDetailResponse.FieldType.STRING); // Default
    }

    /**
     * Check if field is sensitive
     */
    public boolean isSensitiveField(String entityType, String fieldName) {
        return fieldName.equals("password") ||
               fieldName.equals("passportNumber") ||
               fieldName.equals("bankAccount") ||
               fieldName.equals("salary");
    }

    private void initializeLabels() {
        // Product labels
        Map<String, String> productLabels = new HashMap<>();
        productLabels.put("name", "Nomi");
        productLabels.put("sku", "SKU");
        productLabels.put("purchasePrice", "Xarid narxi");
        productLabels.put("sellingPrice", "Sotuv narxi");
        productLabels.put("quantity", "Miqdor");
        productLabels.put("minStockLevel", "Minimal zaxira");
        productLabels.put("season", "Mavsum");
        productLabels.put("brandName", "Brend");
        productLabels.put("categoryName", "Kategoriya");
        productLabels.put("sizeString", "O'lcham");
        productLabels.put("loadIndex", "Yuk indeksi");
        productLabels.put("speedRating", "Tezlik reytingi");
        productLabels.put("active", "Faol");
        productLabels.put("description", "Tavsif");
        entityFieldLabels.put("Product", productLabels);

        // Customer labels
        Map<String, String> customerLabels = new HashMap<>();
        customerLabels.put("firstName", "Ism");
        customerLabels.put("lastName", "Familiya");
        customerLabels.put("phone", "Telefon");
        customerLabels.put("email", "Email");
        customerLabels.put("address", "Manzil");
        customerLabels.put("birthDate", "Tug'ilgan sana");
        customerLabels.put("notes", "Izohlar");
        entityFieldLabels.put("Customer", customerLabels);

        // Employee labels
        Map<String, String> employeeLabels = new HashMap<>();
        employeeLabels.put("firstName", "Ism");
        employeeLabels.put("lastName", "Familiya");
        employeeLabels.put("position", "Lavozim");
        employeeLabels.put("salary", "Maosh");
        employeeLabels.put("phone", "Telefon");
        employeeLabels.put("email", "Email");
        employeeLabels.put("passportNumber", "Pasport raqami");
        employeeLabels.put("bankAccount", "Hisob raqami");
        employeeLabels.put("hireDate", "Ishga qabul qilingan sana");
        employeeLabels.put("active", "Faol");
        entityFieldLabels.put("Employee", employeeLabels);

        // Supplier labels
        Map<String, String> supplierLabels = new HashMap<>();
        supplierLabels.put("name", "Nomi");
        supplierLabels.put("contactPerson", "Kontakt shaxs");
        supplierLabels.put("phone", "Telefon");
        supplierLabels.put("email", "Email");
        supplierLabels.put("address", "Manzil");
        supplierLabels.put("inn", "INN");
        supplierLabels.put("bankAccount", "Hisob raqami");
        supplierLabels.put("paymentTerms", "To'lov shartlari");
        entityFieldLabels.put("Supplier", supplierLabels);

        // Brand labels
        Map<String, String> brandLabels = new HashMap<>();
        brandLabels.put("name", "Nomi");
        brandLabels.put("country", "Mamlakat");
        brandLabels.put("active", "Faol");
        entityFieldLabels.put("Brand", brandLabels);

        // Category labels
        Map<String, String> categoryLabels = new HashMap<>();
        categoryLabels.put("name", "Nomi");
        categoryLabels.put("description", "Tavsif");
        entityFieldLabels.put("Category", categoryLabels);

        // Sale labels
        Map<String, String> saleLabels = new HashMap<>();
        saleLabels.put("saleDate", "Sotuv sanasi");
        saleLabels.put("totalAmount", "Umumiy summa");
        saleLabels.put("discount", "Chegirma");
        saleLabels.put("finalAmount", "Yakuniy summa");
        saleLabels.put("customerName", "Mijoz");
        saleLabels.put("employeeName", "Xodim");
        saleLabels.put("paymentMethod", "To'lov usuli");
        saleLabels.put("status", "Holat");
        entityFieldLabels.put("Sale", saleLabels);

        // PurchaseOrder labels
        Map<String, String> purchaseLabels = new HashMap<>();
        purchaseLabels.put("orderDate", "Buyurtma sanasi");
        purchaseLabels.put("expectedDeliveryDate", "Kutilayotgan yetkazib berish sanasi");
        purchaseLabels.put("actualDeliveryDate", "Haqiqiy yetkazib berish sanasi");
        purchaseLabels.put("totalAmount", "Umumiy summa");
        purchaseLabels.put("supplierName", "Yetkazib beruvchi");
        purchaseLabels.put("status", "Holat");
        purchaseLabels.put("notes", "Izohlar");
        entityFieldLabels.put("PurchaseOrder", purchaseLabels);
    }

    private void initializeFieldTypes() {
        // Product field types
        Map<String, AuditLogDetailResponse.FieldType> productTypes = new HashMap<>();
        productTypes.put("purchasePrice", AuditLogDetailResponse.FieldType.CURRENCY);
        productTypes.put("sellingPrice", AuditLogDetailResponse.FieldType.CURRENCY);
        productTypes.put("quantity", AuditLogDetailResponse.FieldType.NUMBER);
        productTypes.put("minStockLevel", AuditLogDetailResponse.FieldType.NUMBER);
        productTypes.put("season", AuditLogDetailResponse.FieldType.ENUM);
        productTypes.put("active", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Product", productTypes);

        // Customer field types
        Map<String, AuditLogDetailResponse.FieldType> customerTypes = new HashMap<>();
        customerTypes.put("birthDate", AuditLogDetailResponse.FieldType.DATE);
        entityFieldTypes.put("Customer", customerTypes);

        // Employee field types
        Map<String, AuditLogDetailResponse.FieldType> employeeTypes = new HashMap<>();
        employeeTypes.put("salary", AuditLogDetailResponse.FieldType.CURRENCY);
        employeeTypes.put("hireDate", AuditLogDetailResponse.FieldType.DATE);
        employeeTypes.put("active", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Employee", employeeTypes);

        // Sale field types
        Map<String, AuditLogDetailResponse.FieldType> saleTypes = new HashMap<>();
        saleTypes.put("saleDate", AuditLogDetailResponse.FieldType.DATETIME);
        saleTypes.put("totalAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        saleTypes.put("discount", AuditLogDetailResponse.FieldType.CURRENCY);
        saleTypes.put("finalAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        saleTypes.put("paymentMethod", AuditLogDetailResponse.FieldType.ENUM);
        saleTypes.put("status", AuditLogDetailResponse.FieldType.ENUM);
        entityFieldTypes.put("Sale", saleTypes);

        // PurchaseOrder field types
        Map<String, AuditLogDetailResponse.FieldType> purchaseTypes = new HashMap<>();
        purchaseTypes.put("orderDate", AuditLogDetailResponse.FieldType.DATE);
        purchaseTypes.put("expectedDeliveryDate", AuditLogDetailResponse.FieldType.DATE);
        purchaseTypes.put("actualDeliveryDate", AuditLogDetailResponse.FieldType.DATE);
        purchaseTypes.put("totalAmount", AuditLogDetailResponse.FieldType.CURRENCY);
        purchaseTypes.put("status", AuditLogDetailResponse.FieldType.ENUM);
        entityFieldTypes.put("PurchaseOrder", purchaseTypes);

        // Brand field types
        Map<String, AuditLogDetailResponse.FieldType> brandTypes = new HashMap<>();
        brandTypes.put("active", AuditLogDetailResponse.FieldType.BOOLEAN);
        entityFieldTypes.put("Brand", brandTypes);
    }
}
