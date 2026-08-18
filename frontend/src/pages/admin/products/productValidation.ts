// frontend/src/pages/admin/products/productValidation.ts
import type { ProductPayload } from './productTypes';

export interface ValidationError {
  field: string;
  message: string;
}

const EU_SIZE_RE = /^\d+(\.\d+)?$/;

export function isValidEuSize(size: unknown): boolean {
  const s = String(size).trim();
  const num = parseFloat(s);
  if (isNaN(num) || num < 3 || num > 45) return false;
  return EU_SIZE_RE.test(s);
}

export function validateProduct(product: ProductPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!product.name.trim()) errors.push({ field: 'name', message: 'Product name is required' });
  if (!product.sku.trim()) errors.push({ field: 'sku', message: 'SKU is required' });
  else if (!/^[A-Za-z0-9._-]+$/.test(product.sku.trim())) {
    errors.push({ field: 'sku', message: 'SKU can only contain letters, numbers, dots, underscores and dashes' });
  }

  if (product.price === null || product.price === undefined || isNaN(product.price) || product.price < 0) {
    errors.push({ field: 'price', message: 'Price must be a positive number' });
  }
  if (product.original_price != null && (isNaN(product.original_price) || product.original_price < 0)) {
    errors.push({ field: 'original_price', message: 'MRP must be a positive number' });
  }
  if (product.cost_price != null && (isNaN(product.cost_price) || product.cost_price < 0)) {
    errors.push({ field: 'cost_price', message: 'Cost price must be a positive number' });
  }
  if (product.cost_price != null && product.price > 0 && product.cost_price > product.price) {
    errors.push({ field: 'cost_price', message: 'Cost price cannot exceed selling price' });
  }

  const invalidSizes = product.size_stock.filter(s => !isValidEuSize(s.size_label));
  if (invalidSizes.length > 0) {
    errors.push({ field: 'size_stock', message: `Invalid size label: ${invalidSizes.map(s => s.size_label).join(', ')}` });
  }

  return errors;
}

export function toErrorMessage(errors: ValidationError[]): string {
  return errors.map(e => e.message).join('. ');
}