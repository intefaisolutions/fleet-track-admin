import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { SignInPage } from './pages/auth/SignInPage';
import { SetupSuperAdminPage } from './pages/auth/SetupSuperAdminPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CompaniesPage } from './pages/companies/CompaniesPage';
import { LicensesPage } from './pages/licenses/LicensesPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';
import { RevenueOverviewPage } from './pages/revenue/RevenueOverviewPage';
import { ROUTES } from './config/constants';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
          <Route path={ROUTES.SETUP_SUPER_ADMIN} element={<SetupSuperAdminPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.COMPANIES} element={<CompaniesPage />} />
              <Route path={ROUTES.LICENSES} element={<LicensesPage />} />
              <Route path={ROUTES.SUBSCRIPTIONS} element={<SubscriptionsPage />} />
              <Route path={ROUTES.REVENUE} element={<RevenueOverviewPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
