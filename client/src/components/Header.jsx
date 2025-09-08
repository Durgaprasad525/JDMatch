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
          
        </div>
      </div>
    </header>
  );
}
