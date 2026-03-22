import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsLoading } from '../features/auth/authSlice';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { FullscreenSpinner } from '../components/ui/LoadingSpinner';

// Auth pages
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';

// Customer pages
import HomePage from '../features/customer/HomePage';
import RestaurantListPage from '../features/customer/RestaurantListPage';
import RestaurantDetailPage from '../features/customer/RestaurantDetailPage';
import CartPage from '../features/customer/CartPage';
import CheckoutPage from '../features/customer/CheckoutPage';
import OrderSuccessPage from '../features/customer/OrderSuccessPage';
import OrderHistoryPage from '../features/customer/OrderHistoryPage';
import OrderTrackingPage from '../features/customer/OrderTrackingPage';
import ProfilePage from '../features/customer/ProfilePage';

// Restaurant owner pages
import ApplicationForm from '../features/restaurant/ApplicationForm';
import RestaurantDashboard from '../features/restaurant/RestaurantDashboard';
import MenuManagement from '../features/restaurant/MenuManagement';
import OrderManagement from '../features/restaurant/OrderManagement';
import EarningsPage from '../features/restaurant/EarningsPage';
import RestaurantSettings from '../features/restaurant/RestaurantSettings';

// Rider pages
import RiderApplicationForm from '../features/rider/ApplicationForm';
import RiderDashboard from '../features/rider/RiderDashboard';
import ActiveDelivery from '../features/rider/ActiveDelivery';
import DeliveryHistory from '../features/rider/DeliveryHistory';
import RiderEarningsPage from '../features/rider/EarningsPage';

// Admin pages
import AdminDashboard from '../features/admin/AdminDashboard';
import RestaurantApplications from '../features/admin/RestaurantApplications';
import RiderApplications from '../features/admin/RiderApplications';
import UserManagement from '../features/admin/UserManagement';
import ComplaintManagement from '../features/admin/ComplaintManagement';
import CouponManagement from '../features/admin/CouponManagement';
import AdminOrderManagement from '../features/admin/OrderManagement';

// Placeholder for unbuilt pages
const Placeholder = ({ name }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <h2 className="text-2xl font-bold text-[#1C1C1C]">{name}</h2>
    <p className="text-[#7E808C]">Coming Soon</p>
  </div>
);

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <h2 className="text-6xl font-bold text-[#E23744]">404</h2>
    <p className="text-xl text-[#1C1C1C]">Page not found</p>
    <a href="/" className="text-[#E23744] hover:underline text-sm">Go home</a>
  </div>
);

const GuestRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  if (isLoading) return <FullscreenSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/restaurants" element={<RestaurantListPage />} />
      <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
      <Route path="/about" element={<Placeholder name="About" />} />
      <Route path="/contact" element={<Placeholder name="Contact" />} />
      <Route path="/terms" element={<Placeholder name="Terms" />} />

      {/* Guest only */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

      {/* Protected — any authenticated user */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><RoleRoute allowedRoles={['customer']}><CartPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><RoleRoute allowedRoles={['customer']}><CheckoutPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/order-success" element={<ProtectedRoute><RoleRoute allowedRoles={['customer']}><OrderSuccessPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><RoleRoute allowedRoles={['customer']}><OrderHistoryPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><RoleRoute allowedRoles={['customer']}><OrderTrackingPage /></RoleRoute></ProtectedRoute>} />

      {/* Restaurant owner */}
      <Route path="/restaurant/dashboard" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><RestaurantDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/restaurant/application" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><ApplicationForm /></RoleRoute></ProtectedRoute>} />
      <Route path="/restaurant/menu" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><MenuManagement /></RoleRoute></ProtectedRoute>} />
      <Route path="/restaurant/orders" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><OrderManagement /></RoleRoute></ProtectedRoute>} />
      <Route path="/restaurant/earnings" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><EarningsPage /></RoleRoute></ProtectedRoute>} />
      <Route path="/restaurant/settings" element={<ProtectedRoute><RoleRoute allowedRoles={['restaurant_owner']}><RestaurantSettings /></RoleRoute></ProtectedRoute>} />

      {/* Rider */}
      <Route path="/rider/dashboard" element={<ProtectedRoute><RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/rider/application" element={<ProtectedRoute><RoleRoute allowedRoles={['rider']}><RiderApplicationForm /></RoleRoute></ProtectedRoute>} />
      <Route path="/rider/delivery" element={<ProtectedRoute><RoleRoute allowedRoles={['rider']}><ActiveDelivery /></RoleRoute></ProtectedRoute>} />
      <Route path="/rider/history" element={<ProtectedRoute><RoleRoute allowedRoles={['rider']}><DeliveryHistory /></RoleRoute></ProtectedRoute>} />
      <Route path="/rider/earnings" element={<ProtectedRoute><RoleRoute allowedRoles={['rider']}><RiderEarningsPage /></RoleRoute></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/restaurants" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><RestaurantApplications /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/riders" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><RiderApplications /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><UserManagement /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/complaints" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><ComplaintManagement /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/coupons" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><CouponManagement /></RoleRoute></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute><RoleRoute allowedRoles={['admin']}><AdminOrderManagement /></RoleRoute></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
