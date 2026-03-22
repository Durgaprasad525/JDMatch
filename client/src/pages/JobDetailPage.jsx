import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, Upload, Users, Star, ChevronDown,
  CheckCircle, Clock, XCircle, FileText, Briefcase, AlertCircle,
  Send, Copy, Shield, Mic, MessageSquare, Trophy,
} from 'lucide-react';
import { trpc } from '../utils/trpc';

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT:  'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

// ─── Score helpers ───────────────────────────────────────────────────────────
function scoreColor(s) {
  return s >= 70 ? 'text-green-600' : s >= 50 ? 'text-amber-500' : 'text-red-500';
}
function scoreBg(s) {
  return s >= 70
    ? 'bg-green-50 ring-green-200'
    : s >= 50
      ? 'bg-amber-50 ring-amber-200'
      : 'bg-red-50 ring-red-200';
}
function verdictText(s) {
  return s >= 70 ? 'PASSED' : s >= 50 ? 'BORDERLINE' : 'FAILED';
}
function verdictChip(s) {
  return s >= 70
    ? 'bg-green-500 text-white'
    : s >= 50
      ? 'bg-amber-400 text-white'
      : 'bg-red-500 text-white';
}

// ─── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const radius = isLg ? 36 : isSm ? 16 : 22;
  const stroke = isLg ? 5 : 3;
  const circumference = 2 * Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f87171';
  const dim = (radius + stroke) * 2 + 2;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round" />
      </svg>
      <span className={`absolute font-bold text-gray-800 ${isLg ? 'text-2xl' : isSm ? 'text-[11px]' : 'text-sm'}`}>
        {pct}
      </span>
    </div>
  );
}

// ─── Interview report detail ─────────────────────────────────────────────────
function InterviewReportDetail({ interviewId }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const { data, isLoading } = trpc.interviews.getReport.useQuery(
    { interviewId }, { enabled: !!interviewId }
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-6">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-400 border-t-transparent" />
    </div>
  );
  if (!data) return null;

  const notes = data.aiNotes;
  const antiCheatClean = data.tabSwitches === 0 && data.copyPasteEvents === 0 && data.cameraOffEvents === 0;

  return (
    <div className="space-y-4">
      {/* Sub-scores */}
      {notes && (notes.communicationScore != null || notes.technicalScore != null || notes.confidenceScore != null) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Communication', value: notes.communicationScore },
            { label: 'Technical',     value: notes.technicalScore },
            { label: 'Confidence',    value: notes.confidenceScore },
          ].map(({ label, value }) => value != null && (
            <div key={label} className="flex flex-col items-center bg-white rounded-xl p-3 gap-1 ring-1 ring-gray-100">
              <ScoreRing score={value} size="sm" />
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI summary */}
      {notes?.notes && (
        <p className="text-sm text-gray-700 leading-relaxed">{notes.notes}</p>
      )}

      {/* Strengths + Concerns */}
      {(notes?.strengths?.length > 0 || notes?.concerns?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {notes.strengths?.length > 0 && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Strengths</p>
              <ul className="space-y-1.5">
                {notes.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {notes.concerns?.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Concerns</p>
              <ul className="space-y-1.5">
                {notes.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Anti-cheat */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl ${antiCheatClean ? 'bg-gray-50' : 'bg-red-50'}`}>
        <Shield className={`h-3.5 w-3.5 flex-shrink-0 ${antiCheatClean ? 'text-gray-400' : 'text-red-500'}`} />
        <span className="text-xs text-gray-400">Anti-cheat</span>
        {[
          { count: data.tabSwitches,     label: 'tab switch',  warn: 2 },
          { count: data.copyPasteEvents, label: 'copy-paste',  warn: 1 },
          { count: data.cameraOffEvents, label: 'camera off',  warn: 1 },
        ].map(({ count, label, warn }) => (
          <span key={label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            count >= warn ? 'bg-red-100 text-red-700' : 'bg-white text-gray-500 ring-1 ring-gray-200'
          }`}>
            {count} {label}
          </span>
        ))}
      </div>

      {/* Transcript */}
      {data.transcript && (
        <div>
          <button
            onClick={() => setShowTranscript(t => !t)}
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {showTranscript ? 'Hide transcript' : 'View transcript'}
            <ChevronDown className={`h-3 w-3 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
          </button>
          {showTranscript && (
            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
              {data.transcript}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invite button ───────────────────────────────────────────────────────────
function InviteButton({ app, onInvited }) {
  const [inviteLink, setInviteLink] = useState(
    app.interview?.token ? `${window.location.origin}/interview/${app.interview.token}` : null
  );
  const [copied, setCopied] = useState(false);

  const invite = trpc.interviews.invite.useMutation({
    onSuccess: (res) => {
      const result = res.results?.[0];
      if (result?.success) { setInviteLink(result.interviewUrl); onInvited?.(); }
    },
  });

  const copy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (app.status === 'INTERVIEW_INVITED' || app.status === 'INTERVIEWED') {
    return inviteLink ? (
      <button
        onClick={copy}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
      >
        {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    ) : null;
  }

  return (
    <button
      onClick={() => invite.mutate({ applicationIds: [app.id] })}
      disabled={invite.isLoading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50"
    >
      {invite.isLoading
        ? <span className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
        : <Send className="h-3 w-3" />}
      Invite
    </button>
  );
}

// ─── Upload zone ─────────────────────────────────────────────────────────────
function UploadZone({ onFiles }) {
  const onDrop = useCallback(files => onFiles(files), [onFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true,
  });
  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-600">
        {isDragActive ? 'Drop resumes here' : 'Drag & drop resumes or click to browse'}
      </p>
      <p className="text-xs text-gray-400 mt-1">PDF files only · up to 20 at once</p>
    </div>
  );
}

// ─── Top Candidates Spotlight ────────────────────────────────────────────────
function TopCandidatesSpotlight({ applications }) {
  const completed = applications
    .filter(a => a.interview?.status === 'COMPLETED' && a.interview?.aiScore != null)
    .sort((a, b) => b.interview.aiScore - a.interview.aiScore)
    .slice(0, 3);

  if (completed.length === 0) return null;

  const rankStyles = [
    { numBg: 'bg-yellow-100', numText: 'text-yellow-700', cardBg: 'bg-yellow-50', ring: 'ring-yellow-200' },
    { numBg: 'bg-gray-100',   numText: 'text-gray-600',   cardBg: 'bg-gray-50',   ring: 'ring-gray-200'   },
    { numBg: 'bg-orange-100', numText: 'text-orange-600', cardBg: 'bg-orange-50', ring: 'ring-orange-200' },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <h2 className="font-semibold text-gray-900">Top Interview Performers</h2>
        <span className="text-sm text-gray-400">
          {applications.filter(a => a.interview?.status === 'COMPLETED').length} completed
        </span>
      </div>

      <div className={`grid gap-3 ${
        completed.length === 1 ? 'grid-cols-1 sm:max-w-xs' :
        completed.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        {completed.map((app, i) => {
          const s = app.interview.aiScore;
          const r = rankStyles[i];
          return (
            <div key={app.id} className={`${r.cardBg} ring-1 ${r.ring} rounded-2xl p-4 flex flex-col items-center text-center gap-3`}>
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-full ${r.numBg} ${r.numText} text-xs font-bold flex items-center justify-center`}>
                {i + 1}
              </div>

              {/* Score ring */}
              <ScoreRing score={s} size="lg" />

              {/* Name */}
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{app.candidate.name}</p>
                {app.candidate.email && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{app.candidate.email}</p>
                )}
              </div>

              {/* Verdict */}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${verdictChip(s)}`}>
                {verdictText(s)}
              </span>

              {/* Resume score reference */}
              {app.score != null && (
                <p className="text-xs text-gray-400 -mt-1">
                  Resume: <span className={`font-semibold ${scoreColor(app.score)}`}>{Math.round(app.score)}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Unified candidate row ───────────────────────────────────────────────────
function CandidateRow({ app, rank, onInvited }) {
  const [expanded, setExpanded] = useState(false);
  const resumeScore = app.score ?? 0;
  const iScore = app.interview?.aiScore;
  const interviewDone = app.interview?.status === 'COMPLETED';
  const isTop3 = rank <= 3;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
      isTop3 ? 'border-primary-100' : 'border-gray-200'
    }`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Rank badge */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          rank === 1 ? 'bg-yellow-100 text-yellow-700' :
          rank === 2 ? 'bg-gray-100 text-gray-600' :
          rank === 3 ? 'bg-orange-100 text-orange-600' :
          'bg-gray-50 text-gray-400'
        }`}>{rank}</div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{app.candidate.name}</p>
          {app.candidate.email && (
            <p className="text-xs text-gray-400 truncate">{app.candidate.email}</p>
          )}
        </div>

        {/* Score pills — always visible */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Resume score pill */}
          {app.score != null && (
            <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl ring-1 min-w-[52px] ${scoreBg(resumeScore)}`}>
              <span className={`text-base font-black leading-none ${scoreColor(resumeScore)}`}>
                {Math.round(resumeScore)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">Resume</span>
            </div>
          )}

          {/* Interview score pill */}
          {iScore != null && (
            <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl ring-1 min-w-[52px] ${scoreBg(iScore)}`}>
              <span className={`text-base font-black leading-none ${scoreColor(iScore)}`}>
                {Math.round(iScore)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                <Mic className="h-2.5 w-2.5" />AI
              </span>
            </div>
          )}

          {/* Status + actions (when no interview score) */}
          {!interviewDone && (
            <div className="flex items-center gap-1.5">
              {app.interview?.status === 'IN_PROGRESS' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 ring-1 ring-blue-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />Live
                </span>
              )}
              {(app.status === 'INTERVIEW_INVITED' || app.interview?.status === 'SCHEDULED') &&
                app.interview?.status !== 'IN_PROGRESS' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600 ring-1 ring-violet-200">
                  Invited
                </span>
              )}
              <InviteButton app={app} onInvited={onInvited} />
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors ml-1"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
          {interviewDone ? (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" /> AI Interview Report
              </p>
              <InterviewReportDetail interviewId={app.interview.id} />
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Resume Analysis
              </p>
              {(app.strengths?.length > 0 || app.weaknesses?.length > 0 || app.recommendation) ? (
                <div className="space-y-3">
                  {(app.strengths?.length > 0 || app.weaknesses?.length > 0) && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {app.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Strengths</p>
                          <ul className="space-y-1">
                            {app.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {app.weaknesses?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">Gaps</p>
                          <ul className="space-y-1">
                            {app.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                                <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />{w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {app.recommendation && (
                    <p className="text-sm text-gray-600 bg-white rounded-xl p-3 ring-1 ring-gray-100">
                      {app.recommendation}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No resume analysis data.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const { data: job, isLoading, refetch } = trpc.jobs.getById.useQuery({ id });

  const scoreResumes = trpc.jobs.uploadAndScore.useMutation({
    onSuccess: (result) => {
      setUploadSuccess(`Scored ${result.scored} of ${result.total} resumes successfully.`);
      setPendingFiles([]);
      setShowUpload(false);
      refetch();
    },
    onError: (err) => setUploadError(err.message),
  });

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setUploadError(''); setUploadSuccess('');
    const toBase64 = f => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    try {
      scoreResumes.mutate({ jobId: id, cvFiles: await Promise.all(pendingFiles.map(toBase64)) });
    } catch { setUploadError('Failed to read files. Please try again.'); }
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
    </div>
  );

  if (!job) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Job not found.</p>
      <Link to="/dashboard" className="text-primary-600 mt-2 inline-block">← Back to dashboard</Link>
    </div>
  );

  const applications   = job.applications ?? [];
  const scored         = applications.filter(a => a.score != null);
  const invitedCount   = applications.filter(a =>
    a.status === 'INTERVIEW_INVITED' || a.interview?.status === 'SCHEDULED'
  ).length;
  const completedCount = applications.filter(a => a.interview?.status === 'COMPLETED').length;
  const awaitingCount  = applications.filter(a =>
    a.interview && a.interview.status !== 'COMPLETED'
  ).length;
  const hasAnyCandidates = applications.length > 0;
  const uploadOpen = !hasAnyCandidates || showUpload;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />Back to Dashboard
      </button>

      {/* ── Job header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-50 rounded-xl flex-shrink-0">
            <Briefcase className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Created by {job.createdBy?.name} · {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[job.status]}`}>
                {job.status}
              </span>
            </div>

            {job.description && (
              <p className="mt-3 text-sm text-gray-500 line-clamp-2 leading-relaxed">{job.description}</p>
            )}

            {/* Pipeline funnel + action */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1 flex-wrap">
              {/* Step: screened */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs font-bold text-gray-700">{scored.length}</span>
                <span className="text-xs">screened</span>
              </div>

              <span className="text-gray-200 mx-2 hidden sm:inline font-light">→</span>

              {/* Step: invited */}
              <div className={`flex items-center gap-1.5 ${invitedCount > 0 ? 'text-violet-600' : 'text-gray-400'}`}>
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{invitedCount}</span>
                <span className="text-xs">invited</span>
              </div>

              <span className="text-gray-200 mx-2 hidden sm:inline font-light">→</span>

              {/* Step: completed */}
              <div className={`flex items-center gap-1.5 ${completedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                <Mic className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{completedCount}</span>
                <span className="text-xs">interviewed</span>
              </div>

              {awaitingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-500 ml-2">
                  <Clock className="h-3 w-3" />{awaitingCount} pending
                </span>
              )}

              {/* Add resumes button — pushed to right */}
              <button
                onClick={() => { setShowUpload(v => !v); setUploadError(''); setUploadSuccess(''); }}
                className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                {showUpload ? 'Close' : hasAnyCandidates ? 'Add Resumes' : 'Upload Resumes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload panel (collapsible) ── */}
      {uploadOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Upload Resumes</h2>
          <p className="text-sm text-gray-400 mb-4">AI will score each resume against the job description</p>

          <UploadZone onFiles={files => { setPendingFiles(files); setUploadError(''); setUploadSuccess(''); }} />

          {pendingFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <FileText className="h-3.5 w-3.5 text-primary-400 flex-shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}

          {uploadError && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />{uploadSuccess}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <button onClick={handleUpload} disabled={scoreResumes.isLoading} className="btn-primary mt-4 flex items-center gap-2">
              {scoreResumes.isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Scoring {pendingFiles.length} resume{pendingFiles.length !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Score {pendingFiles.length} Resume{pendingFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Top Candidates Spotlight ── */}
      <TopCandidatesSpotlight applications={applications} />

      {/* ── All Candidates unified list ── */}
      {scored.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">All Candidates</h2>
              <span className="text-sm text-gray-400">{scored.length} screened</span>
            </div>
            {awaitingCount > 0 && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />{awaitingCount} awaiting interview
              </p>
            )}
          </div>
          <div className="space-y-2.5">
            {scored.map((app, i) => (
              <CandidateRow key={app.id} app={app} rank={i + 1} onInvited={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {applications.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-16">
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No candidates yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload resumes above to start scoring</p>
        </div>
      )}
    </div>
  );
}
