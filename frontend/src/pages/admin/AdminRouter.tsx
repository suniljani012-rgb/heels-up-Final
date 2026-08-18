import React, { Suspense, lazy } from 'react';
import DashboardView from './DashboardView';
import ProductsManager from './products/ProductsManager';
import StockManager from './StockManager';
import OrdersManager from './OrdersManager';
import CategoriesManager from './CategoriesManager';
import CustomersManager from './CustomersManager';

// Lazy-loaded heavy modules for instant 0ms initial page download (<150KB)
const PosTerminal = lazy(() => import('./PosTerminal'));
const EnterpriseReports = lazy(() => import('./EnterpriseReports'));
const PaymentsManager = lazy(() => import('./PaymentsManager'));
const LogisticsManager = lazy(() => import('./LogisticsManager'));
const ReturnsManager = lazy(() => import('./ReturnsManager'));
const ReviewsModeration = lazy(() => import('./ReviewsModeration'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const CouponsManager = lazy(() => import('./CouponsManager'));
const BannersManager = lazy(() => import('./BannersManager'));
const PagesManager = lazy(() => import('./PagesManager'));
const SettingsManager = lazy(() => import('./SettingsManager'));
const StaffManager = lazy(() => import('./StaffManager'));

const LazyFallback = () => (
  <div className="p-8 flex flex-col items-center justify-center min-h-[350px] space-y-3">
    <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-mono text-slate-400">Loading module...</span>
  </div>
);

import type {
  Product, Order, Category, Coupon, Banner, PageConfig,
  Staff, Customer, ReturnRequest, Review, AuditLog, PosSale,
  Setting, DashboardData
} from './types';

interface RouterProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  dashboardData: DashboardData | null;
  productsList: Product[];
  ordersList: Order[];
  categoriesList: Category[];
  couponsList: Coupon[];
  bannersList: Banner[];
  pagesList: PageConfig[];
  staffList: Staff[];
  customersList: Customer[];
  reviewsList: Review[];
  returnsList: ReturnRequest[];
  settingsList: Setting[];
  auditLogs: AuditLog[];
  paymentsList?: any[];
  token: string;
  dataLoading: boolean;
  loadAllData: () => void;
  handleToggleBlockCustomer: (cust: Customer) => void;
}

export default function AdminRouter({
  activeTab,
  setActiveTab,
  dashboardData,
  productsList,
  ordersList,
  categoriesList,
  couponsList,
  bannersList,
  pagesList,
  staffList,
  customersList,
  reviewsList,
  returnsList,
  settingsList,
  auditLogs,
  paymentsList = [],
  token,
  dataLoading,
  loadAllData,
  handleToggleBlockCustomer
}: RouterProps) {
  return (
    <Suspense fallback={<LazyFallback />}>
      {(() => {
        switch (activeTab) {
          case 'dashboard':
            return (
              <DashboardView
                data={dashboardData}
                orders={ordersList}
                products={productsList}
                returns={returnsList}
                onTabChange={setActiveTab}
                onRefresh={loadAllData}
                dataLoading={dataLoading}
              />
            );
          case 'products':
            return <ProductsManager products={productsList} categories={categoriesList} token={token} onRefresh={loadAllData} />;
          case 'stock':
            return <StockManager products={productsList} token={token} onRefresh={loadAllData} />;
          case 'orders':
            return <OrdersManager orders={ordersList} token={token} onRefresh={loadAllData} />;
          case 'categories':
            return <CategoriesManager categories={categoriesList} token={token} onRefresh={loadAllData} />;
          case 'coupons':
            return <CouponsManager coupons={couponsList} token={token} onRefresh={loadAllData} />;
          case 'banners':
            return <BannersManager banners={bannersList} token={token} onRefresh={loadAllData} />;
          case 'pages':
            return <PagesManager pages={pagesList} token={token} onRefresh={loadAllData} />;
          case 'settings':
            return <SettingsManager settings={settingsList} token={token} onRefresh={loadAllData} />;
          case 'staff':
            return (
              <StaffManager
                staff={staffList.map((st) => ({
                  id: st.id || st.user_id,
                  email: st.email,
                  role: st.role,
                  name: st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
                  active: st.is_active !== 0 && !st.is_blocked,
                  two_factor_enabled: st.two_factor_enabled || false,
                  created_at: st.created_at || ''
                }))}
                token={token}
                onRefresh={loadAllData}
              />
            );
          case 'customers':
            return <CustomersManager customers={customersList} onToggleBlock={handleToggleBlockCustomer} />;
          case 'pos':
            return <PosTerminal products={productsList} categories={categoriesList} coupons={couponsList} onOrderCreated={loadAllData} />;
          case 'returns':
            return <ReturnsManager returns={returnsList} onRefresh={loadAllData} />;
          case 'reviews':
            return <ReviewsModeration reviews={reviewsList} onRefresh={loadAllData} />;
          case 'audits':
            return <AuditLogs logs={auditLogs} loading={dataLoading} onRefresh={loadAllData} />;
          case 'payments':
            return <PaymentsManager payments={paymentsList} orders={ordersList} token={token} onRefresh={loadAllData} />;
          case 'logistics':
            return <LogisticsManager orders={ordersList} token={token} onRefresh={loadAllData} />;
          case 'analysis':
            return (
              <EnterpriseReports
                orders={ordersList}
                products={productsList}
                customers={customersList}
                returns={returnsList}
              />
            );
          default:
            return null;
        }
      })()}
    </Suspense>
  );
}
