import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Menu, X, ChevronDown, LogOut, User } from 'lucide-react';
import { selectCurrentUser, selectIsAuthenticated, clearCredentials } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApi';
import NotificationBell from '../../features/notifications/NotificationBell';

const NAV_LINKS = {
  customer: [
    { to: '/', label: 'Home' },
    { to: '/orders', label: 'My Orders' },
    { to: '/profile', label: 'Profile' },
  ],
  restaurant_owner: [
    { to: '/restaurant/dashboard', label: 'Dashboard' },
    { to: '/restaurant/menu', label: 'Menu' },
    { to: '/restaurant/orders', label: 'Orders' },
    { to: '/restaurant/earnings', label: 'Earnings' },
    { to: '/restaurant/settings', label: 'Settings' },
  ],
  rider: [
    { to: '/rider/dashboard', label: 'Dashboard' },
    { to: '/rider/delivery', label: 'Deliveries' },
    { to: '/rider/earnings', label: 'Earnings' },
    { to: '/profile', label: 'Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/restaurants', label: 'Restaurants' },
    { to: '/admin/riders', label: 'Riders' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/complaints', label: 'Complaints' },
    { to: '/admin/coupons', label: 'Coupons' },
    { to: '/admin/orders', label: 'Orders' },
  ],
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [logout] = useLogoutMutation();

  const links = isAuthenticated && user ? (NAV_LINKS[user.role] || []) : [];

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch {}
    dispatch(clearCredentials());
    navigate('/login');
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-[#E23744] tracking-tight shrink-0">
          Food Lagbe
        </Link>

        {/* Desktop nav links */}
        {links.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 rounded text-sm text-[#1C1C1C] hover:bg-[#F1F1F6] hover:text-[#E23744] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <NotificationBell />
              {/* Avatar dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-[#F1F1F6] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E23744] flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                    {user.profilePhoto?.url ? (
                      <img src={user.profilePhoto.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <ChevronDown size={14} className="text-[#7E808C]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-[8px] shadow-md border border-[#E0E0E0] py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#E0E0E0]">
                      <p className="text-sm font-medium text-[#1C1C1C] truncate">{user.name}</p>
                      <p className="text-xs text-[#7E808C] truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#1C1C1C] hover:bg-[#F1F1F6]"
                    >
                      <User size={14} /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[#F1F1F6] w-full text-left"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-[#E23744] hover:bg-[#fff0f1] rounded-[6px] transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-[#E23744] text-white rounded-[6px] hover:bg-[#c42f3a] transition-colors"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-1.5 rounded text-[#7E808C] hover:bg-[#F1F1F6]"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#E0E0E0] px-4 py-3 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 rounded text-sm text-[#1C1C1C] hover:bg-[#F1F1F6]"
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm text-[#E23744]">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm bg-[#E23744] text-white text-center">Register</Link>
            </>
          )}
          {isAuthenticated && (
            <button onClick={handleLogout} className="px-3 py-2 rounded text-sm text-red-600 text-left hover:bg-[#F1F1F6]">
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
