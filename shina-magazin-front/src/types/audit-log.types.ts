/**
 * Operation types for grouped audit logs
 */
export type AuditOperationType =
  | 'DEBT_PAYMENT'
  | 'SALE_CREATE'
  | 'GENERIC';

/**
 * Individual detail item for group detail modal
 */
export interface GroupDetailItem {
  label: string;
  value: string;
  oldValue?: string;
  icon?: string;
  link?: string;
  changeType?: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

/**
 * Audit log group detail for modal display
 */
export interface AuditLogGroupDetail {
  operationType: AuditOperationType;
  operationLabel: string;
  timestamp: string;
  operatorUsername: string;
  operatorLink?: string;
  details: GroupDetailItem[];
  logs: import('./index').AuditLog[];
}

/**
 * Detailed audit log response with parsed field changes and device info
 */
export interface AuditLogDetailResponse {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  createdAt: string;

  // User info
  username: string;
  userId: number;
  ipAddress: string;

  // Device info
  deviceInfo: DeviceInfo;

  // Field changes
  fieldChanges: FieldChange[];

  // Raw JSON
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;

  // Entity metadata
  entityName?: string;
  entityLink?: string;
  operatorLink?: string;
}

/**
 * Individual field change detail
 */
export interface FieldChange {
  fieldName: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  fieldType: 'STRING' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'DATETIME' | 'BOOLEAN' | 'ENUM' | 'JSON';
  isSensitive: boolean;
  oldValueFormatted: string;
  newValueFormatted: string;
}

/**
 * Parsed device and browser information
 */
export interface DeviceInfo {
  deviceType: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  userAgent: string;
}
