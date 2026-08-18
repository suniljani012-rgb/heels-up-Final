// frontend/src/pages/admin/products/ProductsManager.tsx
// Routing-only wrapper for the product management module.
// Keeps the AdminRouter import path stable while delegating to
// focused sub-components (list / form / bulk import).
import React, { useState } from 'react';
import ProductList from './ProductList';
import ProductForm from './ProductForm';
import BulkImport from './BulkImport';
import ProductDetail from './ProductDetail';
import type { AdminProduct, Category } from './productTypes';
import type { Product } from '../types';

interface ProductsManagerProps {
  products: Product[];
  categories: Category[];
  token: string;
  onRefresh: () => void;
}

export default function ProductsManager({ categories, token, onRefresh }: ProductsManagerProps) {
  const [view, setView] = useState<'list' | 'form' | 'bulk' | 'detail'>('list');
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);

  return (
    <>
      {view === 'list' && (
        <ProductList
          categories={categories}
          token={token}
          onAdd={() => { setSelectedProduct(null); setView('form'); }}
          onEdit={(p) => { setSelectedProduct(p); setView('form'); }}
          onDetail={(p) => { setSelectedProduct(p); setView('detail'); }}
          onOpenBulk={() => setView('bulk')}
          onChanged={onRefresh}
        />
      )}

      {view === 'form' && (
        <ProductForm
          product={selectedProduct}
          categories={categories}
          token={token}
          onCancel={() => { setSelectedProduct(null); setView('list'); }}
          onSaved={() => { setSelectedProduct(null); setView('list'); onRefresh(); }}
        />
      )}

      {view === 'bulk' && (
        <BulkImport
          token={token}
          defaultCategory={categories[0]?.name || ''}
          onClose={() => setView('list')}
          onComplete={onRefresh}
        />
      )}
      {view === 'detail' && selectedProduct && (
        <ProductDetail
          id={selectedProduct.id}
          initialProduct={selectedProduct}
          categories={categories}
          token={token}
          onBack={() => setView('list')}
          onEdit={() => setView('form')}
        />
      )}
    </>
  );
}