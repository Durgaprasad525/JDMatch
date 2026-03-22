import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, CheckCircle } from 'lucide-react';
import { trpc } from '../utils/trpc';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      setSuccess(true);
      // Auto sign-in after registration
      try {
        await signIn(form.email, form.password);
        navigate('/dashboard');
      } catch {
        // If auto sign-in fails, redirect to login
        setTimeout(() => navigate('/login'), 2000);
      }
    },
    onError: (err) => {
      setError(err.message || 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    registerMutation.mutate({
      email: form.email,
      password: form.password,
      name: form.name,
      companyName: form.companyName,
    });
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        required
        className="input-field"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl shadow-lg">
              <Brain className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
          <p className="text-gray-500 mt-1">Create your company account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {field('companyName', 'Company Name', 'text', 'Acme Corp')}
            {field('name', 'Your Full Name', 'text', 'Jane Smith')}
            {field('email', 'Work Email', 'email', 'jane@acme.com')}
            {field('password', 'Password', 'password', 'Min 8 characters')}
            {field('confirmPassword', 'Confirm Password', 'password', '••••••••')}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={registerMutation.isLoading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {registerMutation.isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
