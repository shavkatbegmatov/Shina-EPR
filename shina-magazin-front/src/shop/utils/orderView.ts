import type { AccountOrderDetail } from '../data/accountApi';
import type { ShopOrder } from '../store/orderStore';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

/** Buyurtma holati badge ranglari (ERP ShopOrdersPage bilan izchil). */
export const STATUS_TONE: Record<string, Tone> = {
  NEW: 'info', CONFIRMED: 'success', COMPLETED: 'success', CANCELLED: 'error',
};

/** To'lov holati badge ranglari. */
export const PAY_TONE: Record<string, Tone> = {
  PAID: 'success', PENDING: 'warning', PROCESSING: 'info',
  FAILED: 'error', CANCELLED: 'neutral', REFUNDED: 'neutral',
};

/** Storefront sanasi — mijoz tiliga mos (ERP `formatDateTime` ru-RU'ga qattiq bog'langan). */
export function formatOrderDate(d: number | string, lang: string): string {
  return new Date(d).toLocaleString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export interface OrderViewItem {
  key: string;
  name: string;
  sizeString?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  /** Faqat lokal (endigina berilgan) buyurtmada bor — backend javobida rasm yo'q. */
  imageUrl?: string;
}

/**
 * Buyurtma tafsiloti sahifasining yagona ko'rinish modeli. Ikki manba bir shaklga keladi:
 * backend akkaunt buyurtmasi (login qilgan mijoz) va lokal localStorage buyurtmasi (guest).
 */
export interface OrderView {
  orderNo: string;
  createdAt?: number | string;
  items: OrderViewItem[];
  contact: { name: string; phone: string };
  /** i18n kalitlari kichik harfli: `shop.checkout.delivery|pickup`. */
  delivery: { method: string; address?: string };
  /** i18n kaliti kichik harfli: `shop.checkout.pay.<payment>`. */
  payment: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/** Backend `ShopOrderResponse` → ko'rinish modeli. */
export function orderViewFromServer(o: AccountOrderDetail): OrderView {
  return {
    orderNo: o.orderNo,
    createdAt: o.createdAt,
    items: o.items.map((i, idx) => ({
      key: `${i.productName}-${idx}`,
      name: i.productName,
      sizeString: i.sizeString,
      qty: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.totalPrice,
    })),
    contact: { name: o.customerName, phone: o.customerPhone },
    delivery: { method: (o.deliveryMethod ?? '').toLowerCase(), address: o.deliveryAddress },
    payment: (o.paymentMethod ?? '').toLowerCase(),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.totalAmount,
  };
}

/** Lokal (localStorage) buyurtma → ko'rinish modeli. */
export function orderViewFromLocal(o: ShopOrder): OrderView {
  return {
    orderNo: o.orderNo,
    createdAt: o.createdAt,
    items: o.items.map(({ product, qty }) => ({
      key: String(product.id),
      name: product.name,
      sizeString: product.sizeString,
      qty,
      unitPrice: product.sellingPrice,
      lineTotal: product.sellingPrice * qty,
      imageUrl: product.imageUrl,
    })),
    contact: { name: o.contact.name, phone: o.contact.phone },
    delivery: { method: o.delivery.method, address: o.delivery.address },
    payment: o.payment,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
  };
}
