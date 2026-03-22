import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, LayoutDashboard, UtensilsCrossed, ClipboardList, DollarSign, Settings, Truck, History, Users, AlertCircle, Tag, ShoppingBag, Store } from 'lucide-react';
import { selectCurrentUser } from '../../features/auth/authSlice';

const SIDEBAR_LINKS = {
  restaurant_owner: [
    { to: '/restaurant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/restaurant/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/restaurant/orders', label: 'Orders', icon: ClipboardList },
    { to: '/restaurant/earnings', label: 'Earnings', icon: DollarSign },
    { to: '/restaurant/settings', label: 'Settings', icon: Settings },
  ],
  rider: [
    { to: '/rider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/rider/delivery', label: 'Active Delivery', icon: Truck },
    { to: '/rider/history', label: 'History', icon: History },
    { to: '/rider/earnings', label: 'Earnings', icon: DollarSign },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/restaurants', label: 'Restaurants', icon: Store },
    { to: '/admin/riders', label: 'Riders', icon: Truck },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  ],
};

export default function DashboardLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);
  const user = useSelector(selectCurrentUser);
  const links = SIDEBAR_LINKS[user?.role] || [];

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-[#E0E0E0] transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-end p-3 text-[#7E808C] hover:text-[#1C1C1C] border-b border-[#E0E0E0]"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm transition-colors ${
                  isActive
                    ? 'bg-[#fff0f1] text-[#E23744] font-medium'
                    : 'text-[#1C1C1C] hover:bg-[#F1F1F6]'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        {title && (
          <div className="bg-white border-b border-[#E0E0E0] px-6 py-4">
            <h1 className="text-lg font-semibold text-[#1C1C1C]">{title}</h1>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
