import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, Users, ChevronRight, Clock, Search,
  CheckCircle, XCircle, FileText, TrendingUp, Brain, Mic,
  Send, Filter, BarChart3, ArrowUpRight,
} from 'lucide-react';
import { trpc } from '../utils/trpc';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  ACTIVE:  { label: 'Active',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  DRAFT:   { label: 'Draft',    color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  ON_HOLD: { label: 'On Hold',  color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  CLOSED:  { label: 'Closed',   color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
  HIRED:   { label: 'Hired',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
};

function StatsBar({ jobs }) {
  const total = jobs.length;
  const active = jobs.filter(j => j.status === 'ACTIVE').length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j._count?.applications ?? 0), 0);
  const interviewed = jobs.reduce((sum, j) => sum + (j._count?.interviews ?? j._interviewCount ?? 0), 0);

  const stats = [
    { icon: Briefcase,  label: 'Total Jobs',     value: total,           color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-100' },
    { icon: CheckCircle, label: 'Active',         value: active,          color: 'text-green-600',  bg: 'bg-green-50',  ring: 'ring-green-100' },
    { icon: Users,       label: 'Total Candidates', value: totalApplicants, color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
    { icon: Mic,         label: 'Interviews',     value: interviewed,     color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {stats.map(({ icon: Icon, label, value, color, bg, ring }) => (
        <div key={label} className={`bg-white rounded-xl border border-gray-100 p-4 ring-1 ${ring}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function JobCard({ job, onClick }) {
  const status = STATUS_STYLES[job.status] ?? STATUS_STYLES.DRAFT;
  const applicantCount = job._count?.applications ?? 0;
  const date = new Date(job.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
  const timeAgo = getTimeAgo(job.createdAt);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md cursor-pointer transition-all duration-200 group overflow-hidden"
    >
      {/* Status bar */}
      <div className={`h-1 ${
        status.dot === 'bg-green-500' ? 'bg-green-500' :
        status.dot === 'bg-yellow-500' ? 'bg-yellow-400' :
        status.dot === 'bg-orange-500' ? 'bg-orange-400' :
        status.dot === 'bg-blue-500' ? 'bg-blue-500' :
        'bg-gray-300'
      }`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
              {job.title}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />{timeAgo}
              {job.createdBy?.name && (
                <> · {job.createdBy.name}</>
              )}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ml-3 ${status.color}`}>
            {status.label}
          </span>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {job.description}
        </p>

        {/* Bottom metrics */}
        <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold text-gray-600">{applicantCount}</span> candidate{applicantCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {date}
          </span>
          <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-300 group-hover:text-primary-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardPage() {
  const { hrUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const { data: jobs = [], isLoading } = trpc.jobs.list.useQuery();

  const filtered = jobs.filter(j => {
    if (filterStatus !== 'ALL' && j.status !== filterStatus) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">
            {hrUser?.company?.name ?? 'Dashboard'}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Job Postings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your open positions and candidate pipeline
          </p>
        </div>
        <button
          onClick={() => navigate('/jobs/new')}
          className="btn-primary flex items-center gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Job
        </button>
      </div>

      {/* Stats */}
      {jobs.length > 0 && <StatsBar jobs={jobs} />}

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="input-field pl-9 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5">
            {['ALL', 'ACTIVE', 'DRAFT', 'ON_HOLD', 'HIRED', 'CLOSED'].map(s => {
              const count = s === 'ALL' ? jobs.length : jobs.filter(j => j.status === s).length;
              if (s !== 'ALL' && count === 0) return null; // hide empty filters
              const isActive = filterStatus === s;
              const label = s === 'ALL' ? 'All' : (STATUS_STYLES[s]?.label ?? s);
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Job List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-primary-50 to-blue-100 rounded-2xl">
              <Brain className="h-12 w-12 text-primary-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first job posting to start screening candidates with AI
          </p>
          <button
            onClick={() => navigate('/jobs/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create First Job
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No jobs match your filters</p>
          <button
            onClick={() => { setSearch(''); setFilterStatus('ALL'); }}
            className="text-sm text-primary-600 font-medium mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => navigate(`/jobs/${job.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
