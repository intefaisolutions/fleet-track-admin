import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AdminLayout } from './components/layout/AdminLayout';
import { SignInPage } from './pages/auth/SignInPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/legal/TermsOfServicePage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { SetupSuperAdminPage } from './pages/auth/SetupSuperAdminPage';
import { RegisterCompanyPage } from './pages/auth/RegisterCompanyPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { LicensesPage } from './pages/licenses/LicensesPage';
import { PricingPage } from './pages/pricing/PricingPage';
import { PaymentSettingsPage } from './pages/settings/PaymentSettingsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { PendingPaymentsPage } from './pages/payments/PendingPaymentsPage';
import { RevenueOverviewPage } from './pages/revenue/RevenueOverviewPage';
import { CompanyDashboardPage } from './pages/company/CompanyDashboardPage';
import { CompanyVehiclesPage } from './pages/company/CompanyVehiclesPage';
import { CompanyUsersPage } from './pages/company/CompanyUsersPage';
import { CompanyExpensesPage } from './pages/company/CompanyExpensesPage';
import { CompanySubscriptionPage } from './pages/company/CompanySubscriptionPage';
import { CompanyReportsPage } from './pages/company/CompanyReportsPage';
import { CompanySettingsPage } from './pages/company/CompanySettingsPage';
import { CompanyAdminsPage } from './pages/company/CompanyAdminsPage';
import { CompanyPlaceholderPage } from './pages/company/CompanyPlaceholderPage';
import { CompanyLayout } from './components/layout/CompanyLayout';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerVehiclesPage } from './pages/owner/OwnerVehiclesPage';
import { OwnerDriversPage } from './pages/owner/OwnerDriversPage';
import { OwnerExpensesPage } from './pages/owner/OwnerExpensesPage';
import { OwnerAddExpensePage } from './pages/owner/OwnerAddExpensePage';
import { OwnerReportsPage } from './pages/owner/OwnerReportsPage';
import { OwnerSettingsPage } from './pages/owner/OwnerSettingsPage';
import { OwnerUpgradePlanPage } from './pages/owner/OwnerUpgradePlanPage';
import { OwnerLayout } from './components/layout/OwnerLayout';
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
          <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicyPage />} />
          <Route path={ROUTES.TERMS_OF_SERVICE} element={<TermsOfServicePage />} />
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
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.COMPANY_ADMIN]} />}>
            <Route element={<CompanyLayout />}>
              <Route path={ROUTES.COMPANY_DASHBOARD} element={<CompanyDashboardPage />} />
              <Route path={ROUTES.COMPANY_VEHICLES} element={<CompanyVehiclesPage />} />
              <Route path={ROUTES.COMPANY_USERS} element={<CompanyUsersPage />} />
              <Route path={ROUTES.COMPANY_EXPENSES} element={<CompanyExpensesPage />} />
              <Route path={ROUTES.COMPANY_SUBSCRIPTION} element={<CompanySubscriptionPage />} />
              <Route path={ROUTES.COMPANY_ADMINS} element={<CompanyAdminsPage />} />
              <Route path={ROUTES.COMPANY_REPORTS} element={<CompanyReportsPage />} />
              <Route path={ROUTES.COMPANY_DRIVERS} element={<CompanyPlaceholderPage title="Drivers" />} />
              <Route path={ROUTES.COMPANY_SETTINGS} element={<CompanySettingsPage />} />
            </Route>
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={[ROLES.VEHICLE_OWNER]} />}>
            <Route element={<OwnerLayout />}>
              <Route path={ROUTES.OWNER_DASHBOARD} element={<OwnerDashboardPage />} />
              <Route path={ROUTES.OWNER_VEHICLES} element={<OwnerVehiclesPage />} />
              <Route path={ROUTES.OWNER_DRIVERS} element={<OwnerDriversPage />} />
              <Route path={ROUTES.OWNER_EXPENSES} element={<OwnerExpensesPage />} />
              <Route path={ROUTES.OWNER_ADD_EXPENSE} element={<OwnerAddExpensePage />} />
              <Route path={ROUTES.OWNER_REPORTS} element={<OwnerReportsPage />} />
              <Route path={ROUTES.OWNER_SETTINGS} element={<OwnerSettingsPage />} />
              <Route path={ROUTES.OWNER_UPGRADE} element={<OwnerUpgradePlanPage />} />
            </Route>
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



