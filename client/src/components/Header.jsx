import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Brain, LayoutDashboard, LogOut, User, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { isAuthenticated, signOut, user, hrUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const isJobDetail = location.pathname.startsWith('/jobs/') && location.pathname !== '/jobs/new';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + breadcrumb */}
          <div className="flex items-center gap-3">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-primary-500 to-blue-600 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">JDMatch</span>
            </Link>

            {/* Breadcrumb for authenticated users */}
            {isAuthenticated && hrUser?.company?.name && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400 ml-2">
                <span className="text-gray-300">|</span>
                <span className="font-medium text-gray-500">{hrUser.company.name}</span>
              </div>
            )}
          </div>

          {/* Right: Nav */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/dashboard')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Jobs</span>
              </Link>

              <Link
                to="/jobs/new"
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive('/jobs/new')
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Job</span>
              </Link>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-700">
                    {(hrUser?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm py-1.5 px-4"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
