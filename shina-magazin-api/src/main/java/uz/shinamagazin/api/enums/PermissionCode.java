package uz.shinamagazin.api.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Type-safe permission codes enum.
 * Must match the codes in the permissions database table.
 */
@Getter
@RequiredArgsConstructor
public enum PermissionCode {

    // DASHBOARD module
    DASHBOARD_VIEW("DASHBOARD", "VIEW"),

    // PRODUCTS module
    PRODUCTS_VIEW("PRODUCTS", "VIEW"),
    PRODUCTS_CREATE("PRODUCTS", "CREATE"),
    PRODUCTS_UPDATE("PRODUCTS", "UPDATE"),
    PRODUCTS_DELETE("PRODUCTS", "DELETE"),

    // BRANDS module
    BRANDS_VIEW("BRANDS", "VIEW"),
    BRANDS_CREATE("BRANDS", "CREATE"),
    BRANDS_UPDATE("BRANDS", "UPDATE"),
    BRANDS_DELETE("BRANDS", "DELETE"),

    // CATEGORIES module
    CATEGORIES_VIEW("CATEGORIES", "VIEW"),
    CATEGORIES_CREATE("CATEGORIES", "CREATE"),
    CATEGORIES_UPDATE("CATEGORIES", "UPDATE"),
    CATEGORIES_DELETE("CATEGORIES", "DELETE"),

    // SALES module
    SALES_VIEW("SALES", "VIEW"),
    SALES_CREATE("SALES", "CREATE"),
    SALES_UPDATE("SALES", "UPDATE"),
    SALES_DELETE("SALES", "DELETE"),
    SALES_REFUND("SALES", "REFUND"),

    // CUSTOMERS module
    CUSTOMERS_VIEW("CUSTOMERS", "VIEW"),
    CUSTOMERS_CREATE("CUSTOMERS", "CREATE"),
    CUSTOMERS_UPDATE("CUSTOMERS", "UPDATE"),
    CUSTOMERS_DELETE("CUSTOMERS", "DELETE"),

    // DEBTS module
    DEBTS_VIEW("DEBTS", "VIEW"),
    DEBTS_CREATE("DEBTS", "CREATE"),
    DEBTS_UPDATE("DEBTS", "UPDATE"),
    DEBTS_DELETE("DEBTS", "DELETE"),
    DEBTS_PAY("DEBTS", "PAY"),

    // WAREHOUSE module
    WAREHOUSE_VIEW("WAREHOUSE", "VIEW"),
    WAREHOUSE_CREATE("WAREHOUSE", "CREATE"),
    WAREHOUSE_UPDATE("WAREHOUSE", "UPDATE"),
    WAREHOUSE_DELETE("WAREHOUSE", "DELETE"),
    WAREHOUSE_ADJUST("WAREHOUSE", "ADJUST"),

    // SUPPLIERS module
    SUPPLIERS_VIEW("SUPPLIERS", "VIEW"),
    SUPPLIERS_CREATE("SUPPLIERS", "CREATE"),
    SUPPLIERS_UPDATE("SUPPLIERS", "UPDATE"),
    SUPPLIERS_DELETE("SUPPLIERS", "DELETE"),

    // PURCHASES module
    PURCHASES_VIEW("PURCHASES", "VIEW"),
    PURCHASES_CREATE("PURCHASES", "CREATE"),
    PURCHASES_UPDATE("PURCHASES", "UPDATE"),
    PURCHASES_DELETE("PURCHASES", "DELETE"),
    PURCHASES_RECEIVE("PURCHASES", "RECEIVE"),
    PURCHASES_RETURN("PURCHASES", "RETURN"),

    // REPORTS module
    REPORTS_VIEW_SALES("REPORTS", "VIEW_SALES"),
    REPORTS_VIEW_WAREHOUSE("REPORTS", "VIEW_WAREHOUSE"),
    REPORTS_VIEW_DEBTS("REPORTS", "VIEW_DEBTS"),
    REPORTS_EXPORT("REPORTS", "EXPORT"),

    // EMPLOYEES module
    EMPLOYEES_VIEW("EMPLOYEES", "VIEW"),
    EMPLOYEES_CREATE("EMPLOYEES", "CREATE"),
    EMPLOYEES_UPDATE("EMPLOYEES", "UPDATE"),
    EMPLOYEES_DELETE("EMPLOYEES", "DELETE"),
    EMPLOYEES_CHANGE_ROLE("EMPLOYEES", "CHANGE_ROLE"),
    EMPLOYEES_MANAGE_ACCESS("EMPLOYEES", "MANAGE_ACCESS"),

    // USERS module
    USERS_VIEW("USERS", "VIEW"),
    USERS_CREATE("USERS", "CREATE"),
    USERS_UPDATE("USERS", "UPDATE"),
    USERS_DELETE("USERS", "DELETE"),
    USERS_CHANGE_ROLE("USERS", "CHANGE_ROLE"),

    // SETTINGS module
    SETTINGS_VIEW("SETTINGS", "VIEW"),
    SETTINGS_UPDATE("SETTINGS", "UPDATE"),

    // NOTIFICATIONS module
    NOTIFICATIONS_VIEW("NOTIFICATIONS", "VIEW"),
    NOTIFICATIONS_MANAGE("NOTIFICATIONS", "MANAGE"),

    // ROLES module
    ROLES_VIEW("ROLES", "VIEW"),
    ROLES_CREATE("ROLES", "CREATE"),
    ROLES_UPDATE("ROLES", "UPDATE"),
    ROLES_DELETE("ROLES", "DELETE");

    private final String module;
    private final String action;

    /**
     * Get permission code as string (e.g., "PRODUCTS_VIEW")
     */
    public String getCode() {
        return this.name();
    }

    /**
     * Find PermissionCode by string code
     */
    public static PermissionCode fromCode(String code) {
        for (PermissionCode permission : values()) {
            if (permission.name().equals(code)) {
                return permission;
            }
        }
        throw new IllegalArgumentException("Unknown permission code: " + code);
    }

    /**
     * Check if a string code is a valid permission
     */
    public static boolean isValidCode(String code) {
        for (PermissionCode permission : values()) {
            if (permission.name().equals(code)) {
                return true;
            }
        }
        return false;
    }
}
