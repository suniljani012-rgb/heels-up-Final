import { create } from 'zustand'
import { roundToProfessionalPrice } from '../utils/priceHelper'
import { trackAddToCart } from '../utils/analytics'


export interface CartItem {
  id: number;
  name: string;
  price: number; // in paise
  originalPrice?: number | null; // in paise
  qty: number;
  color: string;
  size: string;
  img: string;
  category: string;
  available_stock?: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (id: number, color: string, size: string) => void;
  updateQty: (id: number, color: string, size: string, delta: number) => void;
  clearCart: () => void;
  getCartCount: () => number;
  getCartSubtotal: () => number; // in paise
  getCartTotal: () => number; // in paise
  fetchCartFromBackend: () => Promise<void>;
  syncCart: () => Promise<void>;

  // Geolocation & Dynamic Shipping States
  detectedPincode: string;
  shippingFeeRupees: number;
  deliveryCod: boolean;
  deliveryDays: string;
  deliveryCity: string;
  locationStatus: 'loading' | 'granted' | 'denied' | 'unknown';
  setDetectedPincode: (pin: string) => void;
  setShippingFeeRupees: (fee: number) => void;
  fetchDeliveryEstimate: (pin: string) => Promise<void>;
  detectLocation: () => void;
}

const syncCartToBackend = async (items: CartItem[]) => {
  const token = localStorage.getItem('heelsup_token');
  if (!token) return;
  try {
    await fetch('/api/cart/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: items.map(item => ({
          product_id: item.id,
          size: item.size,
          color: item.color,
          qty: item.qty
        }))
      })
    });
  } catch (err) {
    console.error('Failed to sync cart to backend:', err);
  }
};

export const useCartStore = create<CartState>((set, get) => {
  const savedCart = localStorage.getItem('heelsup_cart');
  let initialItems: CartItem[] = [];
  if (savedCart) {
    try {
      initialItems = JSON.parse(savedCart);
    } catch {
      localStorage.removeItem('heelsup_cart');
    }
  }

  const saveCart = (items: CartItem[]) => {
    localStorage.setItem('heelsup_cart', JSON.stringify(items));
    set({ items });
    syncCartToBackend(items);
  };

  return {
    items: initialItems,
    addItem: (newItem) => {
      const currentItems = get().items;
      const qtyToAdd = newItem.qty || 1;
      
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.color.toLowerCase() === newItem.color.toLowerCase() &&
          item.size === newItem.size
      );

      let updated: CartItem[];
      if (existingIndex > -1) {
        updated = [...currentItems];
        updated[existingIndex].qty += qtyToAdd;
      } else {
        updated = [...currentItems, { ...newItem, qty: qtyToAdd }];
      }
      saveCart(updated);

      // Track add to cart event in GA4
      trackAddToCart({
        id: newItem.id,
        name: newItem.name,
        price: Math.round(newItem.price / 100),
        size: newItem.size,
      });
    },

    removeItem: (id, color, size) => {
      const filtered = get().items.filter(
        (item) =>
          !(item.id === id &&
            (item.color || '').toLowerCase() === (color || '').toLowerCase() &&
            (item.size || '') === (size || ''))
      );
      saveCart(filtered);
    },
    updateQty: (id, color, size, delta) => {
      const updated = get().items
        .map((item) => {
          if (
            item.id === id &&
            (item.color || '').toLowerCase() === (color || '').toLowerCase() &&
            (item.size || '') === (size || '')
          ) {
            return { ...item, qty: Math.max(1, item.qty + delta) };
          }
          return item;
        })
        .filter((item) => item.qty > 0);
      saveCart(updated);
    },
    clearCart: () => {
      saveCart([]);
    },
    getCartCount: () => {
      return get().items.reduce((sum, item) => sum + item.qty, 0);
    },
    getCartSubtotal: () => {
      const baseSubtotal = get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
      if (baseSubtotal >= 159900 || baseSubtotal === 0) {
        return get().items.reduce((sum, item) => {
          return sum + roundToProfessionalPrice(item.price) * item.qty;
        }, 0);
      }
      return get().items.reduce((sum, item) => {
        const itemBasePrice = item.price;
        const displayedItemPrice = itemBasePrice >= 159900 ? itemBasePrice : itemBasePrice + (get().shippingFeeRupees * 100);
        return sum + roundToProfessionalPrice(displayedItemPrice) * item.qty;
      }, 0);
    },
    getCartTotal: () => {
      return get().getCartSubtotal();
    },
    syncCart: async () => {
      await syncCartToBackend(get().items);
    },
    fetchCartFromBackend: async () => {
      const token = localStorage.getItem('heelsup_token');
      if (!token) return;
      try {
        const res = await fetch('/api/cart', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const items = data.data.map((item: any) => {
            let img: string | undefined = undefined;
            if (item.images_json) {
              try {
                const imgs = JSON.parse(item.images_json);
                if (imgs && imgs.length > 0) img = imgs[0];
              } catch {}
            }
            return {
              id: item.product_id,
              name: item.name,
              price: item.price,
              originalPrice: item.original_price,
              qty: item.qty,
              color: item.color || 'Default',
              size: item.size || '38',
              img: img,
              category: item.category || '',
              available_stock: item.available_stock
            };
          });
          localStorage.setItem('heelsup_cart', JSON.stringify(items));
          set({ items });
        }
      } catch (err) {
        console.error('Failed to fetch cart from backend:', err);
      }
    },

    // Geolocation & Dynamic Shipping States
    detectedPincode: localStorage.getItem('hu_delivery_pin') || '',
    shippingFeeRupees: Number(localStorage.getItem('hu_shipping_fee') || '129'), // default max is ₹129
    deliveryCod: true,
    deliveryDays: '3-7',
    deliveryCity: '',
    locationStatus: 'unknown',
    setDetectedPincode: (pin: string) => set({ detectedPincode: pin }),
    setShippingFeeRupees: (fee: number) => set({ shippingFeeRupees: fee }),
    fetchDeliveryEstimate: async (pin: string) => {
      if (!/^\d{6}$/.test(pin)) return;
      try {
        const res = await fetch(`/api/shipping/estimate?pincode=${pin}&total=0`);
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          set({
            detectedPincode: pin,
            shippingFeeRupees: d.fee_rupees,
            deliveryCod: d.cod_available,
            deliveryDays: d.estimated_days,
            deliveryCity: [d.city, d.state].filter(Boolean).join(', '),
          });
          localStorage.setItem('hu_delivery_pin', pin);
          localStorage.setItem('hu_shipping_fee', String(d.fee_rupees));
        }
      } catch (err) {
        console.error('Failed to fetch estimate:', err);
      }
    },
    detectLocation: () => {
      const cachedPin = localStorage.getItem('hu_delivery_pin');
      if (cachedPin && /^\d{6}$/.test(cachedPin)) {
        get().fetchDeliveryEstimate(cachedPin);
        set({ locationStatus: 'granted' });
        return;
      }

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        set({ locationStatus: 'loading' });
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const geo = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'HeelsUp/1.0' } }
              );
              const geoData = await geo.json();
              const pin = geoData?.address?.postcode?.replace(/\s/g, '').slice(0, 6);
              if (pin && /^\d{6}$/.test(pin)) {
                set({ locationStatus: 'granted' });
                get().fetchDeliveryEstimate(pin);
              } else {
                set({ locationStatus: 'denied', shippingFeeRupees: 129 });
              }
            } catch {
              set({ locationStatus: 'denied', shippingFeeRupees: 129 });
            }
          },
          () => {
            set({ locationStatus: 'denied', shippingFeeRupees: 129 });
          },
          { timeout: 5000, maximumAge: 300000 }
        );
      } else {
        set({ locationStatus: 'denied', shippingFeeRupees: 129 });
      }
    }
  };
});
