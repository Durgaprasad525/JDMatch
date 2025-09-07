import { Link, useLocation } from 'react-router-dom';
import { FileText, Brain } from 'lucide-react';

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">JDMatch</span>
          </Link>
          
          <nav className="flex space-x-6">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Upload & Analyze</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
