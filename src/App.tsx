import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AdminLayout } from './components/layout/AdminLayout';
import { SignInPage } from './pages/auth/SignInPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { SetupSuperAdminPage } from './pages/auth/SetupSuperAdminPage';
import { RegisterCompanyPage } from './pages/auth/RegisterCompanyPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { LicensesPage } from './pages/licenses/LicensesPage';
import { PricingPage } from './pages/pricing/PricingPage';
import { PaymentSettingsPage } from './pages/settings/PaymentSettingsPage';
import { PendingPaymentsPage } from './pages/payments/PendingPaymentsPage';
import { RevenueOverviewPage } from './pages/revenue/RevenueOverviewPage';
import { CompanyDashboardPage } from './pages/company/CompanyDashboardPage';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { DriverDashboardPage } from './pages/driver/DriverDashboardPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleProtectedRoute } from './routes/RoleProtectedRoute';
import { ROUTES, ROLES } from './config/constants';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.SETUP_SUPER_ADMIN} element={<SetupSuperAdminPage />} />
          <Route path={ROUTES.REGISTER_COMPANY} element={<RegisterCompanyPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.COMPANIES} element={<CompaniesPage />} />
              <Route path={ROUTES.LICENSES} element={<LicensesPage />} />
              <Route path={ROUTES.PRICING} element={<PricingPage />} />
              <Route path={ROUTES.PAYMENT_SETTINGS} element={<PaymentSettingsPage />} />
              <Route path={ROUTES.PENDING_PAYMENTS} element={<PendingPaymentsPage />} />
              <Route path={ROUTES.REVENUE} element={<RevenueOverviewPage />} />
            </Route>
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN]} />}>
            <Route path={ROUTES.COMPANY_DASHBOARD} element={<CompanyDashboardPage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.VEHICLE_OWNER]} />}>
            <Route path={ROUTES.OWNER_DASHBOARD} element={<OwnerDashboardPage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.DRIVER]} />}>
            <Route path={ROUTES.DRIVER_DASHBOARD} element={<DriverDashboardPage />} />
          </Route>

          <Route path="/" element={<Navigate to={ROUTES.SIGN_IN} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.SIGN_IN} replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
