import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import {
  Download,
  Share2,
  Scissors,
  Home,
  Moon,
  Sun,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

const navLinks = [
  { path: '/', label: 'الرئيسية', icon: Home },
  { path: '/download', label: 'تحميل', icon: Download },
  { path: '/share', label: 'مشاركة', icon: Share2 },
  { path: '/extract', label: 'استخراج', icon: Scissors },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading, login, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.name || user?.email;

  const AuthAction = ({ mobile = false }: { mobile?: boolean }) => {
    if (loading) {
      return (
        <div
          className={
            mobile
              ? 'px-4 py-3 text-sm text-muted-foreground'
              : 'hidden sm:block px-3 py-2 text-sm text-muted-foreground'
          }
        >
          جارِ التحقق...
        </div>
      );
    }

    if (!user) {
      return (
        <button
          onClick={login}
          className={
            mobile
              ? 'flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-[#D4F14B] text-[#030813] hover:bg-[#D4F14B]/90 transition-all'
              : 'hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#D4F14B] text-[#030813] hover:bg-[#D4F14B]/90 transition-all neon-glow'
          }
        >
          <LogIn className="w-4 h-4" />
          سجّل دخول
        </button>
      );
    }

    return (
      <div
        className={
          mobile
            ? 'space-y-2 px-4 py-3 rounded-lg bg-secondary/40'
            : 'hidden sm:flex items-center gap-2'
        }
      >
        <div
          className={
            mobile
              ? 'flex items-center gap-2 text-sm text-foreground'
              : 'max-w-40 truncate flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground bg-secondary/40'
          }
        >
          <User className="w-4 h-4 text-[#D4F14B]" />
          <span className="truncate">{displayName}</span>
        </div>
        <button
          onClick={logout}
          className={
            mobile
              ? 'flex w-full items-center gap-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
              : 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors'
          }
        >
          <LogOut className="w-4 h-4" />
          خروج
        </button>
      </div>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-[#D4F14B] flex items-center justify-center">
              <Download className="w-5 h-5 text-[#030813]" />
            </div>
            <span className="text-xl font-bold text-[#D4F14B] neon-text">
              نزّل
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/15 text-primary neon-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <AuthAction />

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label="تبديل الوضع"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-border/30 mt-2 pt-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 pt-3 border-t border-border/30">
              <AuthAction mobile />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}