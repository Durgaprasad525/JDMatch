import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, Upload, Users, Star, ChevronDown,
  CheckCircle, Clock, XCircle, FileText, Briefcase, AlertCircle,
  Send, Copy, Shield, Mic, MessageSquare, Trophy,
  PauseCircle, PlayCircle, Award, Ban, MoreHorizontal,
  ThumbsUp, ThumbsDown, Download, Pencil, Check, X,
} from 'lucide-react';
import { trpc } from '../utils/trpc';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ACTIVE:  { label: 'Active',   badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  DRAFT:   { label: 'Draft',    badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  ON_HOLD: { label: 'On Hold',  badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  CLOSED:  { label: 'Closed',   badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
  HIRED:   { label: 'Hired',    badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
};

// Valid transitions for the status dropdown
const TRANSITIONS = {
  DRAFT:   [{ to: 'ACTIVE',  label: 'Publish',        icon: PlayCircle,  color: 'text-green-600' }],
  ACTIVE:  [
    { to: 'ON_HOLD', label: 'Put On Hold',    icon: PauseCircle, color: 'text-orange-600' },
    { to: 'HIRED',   label: 'Mark as Hired',  icon: Award,       color: 'text-blue-600' },
    { to: 'CLOSED',  label: 'Close Position', icon: Ban,         color: 'text-gray-500' },
  ],
  ON_HOLD: [
    { to: 'ACTIVE',  label: 'Resume Hiring',  icon: PlayCircle,  color: 'text-green-600' },
    { to: 'HIRED',   label: 'Mark as Hired',  icon: Award,       color: 'text-blue-600' },
    { to: 'CLOSED',  label: 'Close Position', icon: Ban,         color: 'text-gray-500' },
  ],
  HIRED:   [
    { to: 'CLOSED',  label: 'Close Position', icon: Ban,         color: 'text-gray-500' },
  ],
  CLOSED:  [],
};

const JOB_IS_ACTIVE = (s) => s === 'ACTIVE';
const JOB_IS_TERMINAL = (s) => s === 'CLOSED' || s === 'HIRED';

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

// ─── Confirmation modal ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 font-medium rounded-lg text-white transition-colors ${confirmColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status dropdown ────────────────────────────────────────────────────────
function StatusActions({ job, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const transitions = TRANSITIONS[job.status] ?? [];
  if (transitions.length === 0) return null;

  const updateStatus = trpc.jobs.updateStatus.useMutation({
    onSuccess: () => { setConfirm(null); setOpen(false); onStatusChange(); },
  });

  const handleAction = (t) => {
    if (t.to === 'CLOSED' || t.to === 'HIRED') {
      setConfirm(t);
      setOpen(false);
    } else {
      updateStatus.mutate({ id: job.id, status: t.to });
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Change status"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 min-w-[200px]">
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Change status</p>
              {transitions.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.to}
                    onClick={() => handleAction(t)}
                    disabled={updateStatus.isLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Icon className={`h-4 w-4 ${t.color}`} />
                    <span className="font-medium text-gray-700">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.label}
          message={
            confirm.to === 'HIRED'
              ? 'This will mark the position as successfully filled. You won\'t be able to add more resumes or send new interview invites.'
              : 'This will close the position permanently. No new resumes or interviews can be added.'
          }
          confirmLabel={confirm.label}
          confirmColor={confirm.to === 'HIRED' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}
          onConfirm={() => updateStatus.mutate({ id: job.id, status: confirm.to })}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
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

      {notes?.notes && (
        <p className="text-sm text-gray-700 leading-relaxed">{notes.notes}</p>
      )}

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
function InviteButton({ app, jobStatus, onInvited }) {
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

  // Already invited — show copy link
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

  // Don't show invite button if job is not active
  if (!JOB_IS_ACTIVE(jobStatus)) return null;

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

// ─── Select / Reject buttons ────────────────────────────────────────────────
function CandidateActions({ app, onChanged }) {
  const updateStatus = trpc.jobs.updateApplicationStatus.useMutation({
    onSuccess: () => onChanged?.(),
  });

  // Don't show for already decided candidates
  if (app.status === 'SELECTED' || app.status === 'REJECTED') {
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        app.status === 'SELECTED'
          ? 'bg-green-100 text-green-700 ring-1 ring-green-200'
          : 'bg-red-100 text-red-600 ring-1 ring-red-200'
      }`}>
        {app.status === 'SELECTED' ? 'Selected' : 'Rejected'}
      </span>
    );
  }

  // Only show after scoring
  if (app.status === 'PENDING') return null;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => updateStatus.mutate({ applicationId: app.id, status: 'SELECTED' })}
        disabled={updateStatus.isLoading}
        className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        title="Shortlist candidate"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => updateStatus.mutate({ applicationId: app.id, status: 'REJECTED' })}
        disabled={updateStatus.isLoading}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Reject candidate"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
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
              <div className={`w-7 h-7 rounded-full ${r.numBg} ${r.numText} text-xs font-bold flex items-center justify-center`}>
                {i + 1}
              </div>
              <ScoreRing score={s} size="lg" />
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{app.candidate.name}</p>
                {app.candidate.email && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{app.candidate.email}</p>
                )}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${verdictChip(s)}`}>
                {verdictText(s)}
              </span>
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

// ─── Candidate name/email with inline edit + resume download ────────────────
function CandidateInfo({ app, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(app.candidate.name);
  const [editEmail, setEditEmail] = useState(app.candidate.email || '');

  const updateCandidate = trpc.jobs.updateCandidate.useMutation({
    onSuccess: () => { setEditing(false); onChanged?.(); },
  });

  const handleSave = () => {
    const name = editName.trim();
    if (!name) return;
    updateCandidate.mutate({
      applicationId: app.id,
      name,
      email: editEmail.trim() || null,
    });
  };

  if (editing) {
    return (
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Candidate name"
            className="text-sm font-semibold border border-gray-300 rounded-lg px-2 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <input
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="email@example.com"
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 w-44 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} disabled={updateCandidate.isLoading}
            className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEditing(false); setEditName(app.candidate.name); setEditEmail(app.candidate.email || ''); }}
            className="p-1 rounded-md bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="font-semibold text-gray-900 text-sm truncate">{app.candidate.name}</p>
        <button
          onClick={() => setEditing(true)}
          title="Edit candidate info"
          className="p-0.5 rounded text-gray-300 hover:text-primary-500 hover:bg-primary-50 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <CandidateActions app={app} onChanged={onChanged} />
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        {app.candidate.email && (
          <p className="text-xs text-gray-400 truncate">{app.candidate.email}</p>
        )}
        {app.resumeFileUrl && (
          <a
            href={app.resumeFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download Resume"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-50 text-primary-600 hover:bg-primary-100 ring-1 ring-primary-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3" />
            Resume
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Unified candidate row ───────────────────────────────────────────────────
function CandidateRow({ app, rank, jobStatus, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const resumeScore = app.score ?? 0;
  const iScore = app.interview?.aiScore;
  const interviewDone = app.interview?.status === 'COMPLETED';
  const isTop3 = rank <= 3;
  const isDecided = app.status === 'SELECTED' || app.status === 'REJECTED';

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
      app.status === 'REJECTED' ? 'border-gray-200 opacity-60' :
      app.status === 'SELECTED' ? 'border-green-200 ring-1 ring-green-100' :
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

        {/* Name + email + edit + download */}
        <CandidateInfo app={app} onChanged={onChanged} />

        {/* Score pills — always visible */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {app.score != null && (
            <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl ring-1 min-w-[52px] ${scoreBg(resumeScore)}`}>
              <span className={`text-base font-black leading-none ${scoreColor(resumeScore)}`}>
                {Math.round(resumeScore)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">Resume</span>
            </div>
          )}

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
          {!interviewDone && !isDecided && (
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
              <InviteButton app={app} jobStatus={jobStatus} onInvited={onChanged} />
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

// ─── CSV Export ──────────────────────────────────────────────────────────────
function ExportButton({ applications, jobTitle }) {
  const handleExport = () => {
    const headers = ['Rank', 'Name', 'Email', 'Resume Score', 'Interview Score', 'Status'];
    const rows = applications.map((app, i) => [
      i + 1,
      app.candidate.name,
      app.candidate.email || '',
      app.score != null ? Math.round(app.score) : '',
      app.interview?.aiScore != null ? Math.round(app.interview.aiScore) : '',
      app.status,
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobTitle.replace(/\s+/g, '_')}_candidates.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
    >
      <Download className="h-3.5 w-3.5" /> Export CSV
    </button>
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
  const [showFullDesc, setShowFullDesc] = useState(false);

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
  const selectedCount  = applications.filter(a => a.status === 'SELECTED').length;
  const rejectedCount  = applications.filter(a => a.status === 'REJECTED').length;
  const invitedCount   = applications.filter(a =>
    a.status === 'INTERVIEW_INVITED' || a.interview?.status === 'SCHEDULED'
  ).length;
  const completedCount = applications.filter(a => a.interview?.status === 'COMPLETED').length;
  const awaitingCount  = applications.filter(a =>
    a.interview && a.interview.status !== 'COMPLETED'
  ).length;
  const hasAnyCandidates = applications.length > 0;

  const canUpload  = JOB_IS_ACTIVE(job.status);
  const isTerminal = JOB_IS_TERMINAL(job.status);
  const uploadOpen = canUpload && (!hasAnyCandidates || showUpload);

  const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />Back to Dashboard
      </button>

      {/* ── Terminal status banner ── */}
      {isTerminal && (
        <div className={`mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl ${
          job.status === 'HIRED'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-gray-50 border border-gray-200'
        }`}>
          {job.status === 'HIRED'
            ? <Award className="h-5 w-5 text-blue-600 flex-shrink-0" />
            : <Ban className="h-5 w-5 text-gray-400 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${job.status === 'HIRED' ? 'text-blue-800' : 'text-gray-600'}`}>
              {job.status === 'HIRED' ? 'Position Successfully Filled' : 'Position Closed'}
            </p>
            <p className="text-xs text-gray-400">
              {job.closedAt ? `${new Date(job.closedAt).toLocaleDateString()} · ` : ''}
              No new resumes or interviews can be added.
            </p>
          </div>
        </div>
      )}

      {/* ── On Hold banner ── */}
      {job.status === 'ON_HOLD' && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200">
          <PauseCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Hiring Paused</p>
            <p className="text-xs text-gray-400">Resume uploads and new invites are paused. Change status to resume.</p>
          </div>
        </div>
      )}

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
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                  {statusCfg.label}
                </span>
                <StatusActions job={job} onStatusChange={refetch} />
              </div>
            </div>

            {/* Job description with expand/collapse */}
            {job.description && (
              <div className="mt-3">
                <p className={`text-sm text-gray-500 leading-relaxed ${showFullDesc ? '' : 'line-clamp-2'}`}>
                  {job.description}
                </p>
                {job.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(v => !v)}
                    className="text-xs text-primary-600 font-medium mt-1 hover:underline"
                  >
                    {showFullDesc ? 'Show less' : 'Show full description'}
                  </button>
                )}
              </div>
            )}

            {/* Pipeline funnel + action */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1.5 text-gray-500">
                <FileText className="h-3.5 w-3.5" />
                <span className="text-xs font-bold text-gray-700">{scored.length}</span>
                <span className="text-xs">screened</span>
              </div>

              <span className="text-gray-200 mx-2 hidden sm:inline font-light">&rarr;</span>

              <div className={`flex items-center gap-1.5 ${invitedCount > 0 ? 'text-violet-600' : 'text-gray-400'}`}>
                <Send className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{invitedCount}</span>
                <span className="text-xs">invited</span>
              </div>

              <span className="text-gray-200 mx-2 hidden sm:inline font-light">&rarr;</span>

              <div className={`flex items-center gap-1.5 ${completedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                <Mic className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{completedCount}</span>
                <span className="text-xs">interviewed</span>
              </div>

              {selectedCount > 0 && (
                <>
                  <span className="text-gray-200 mx-2 hidden sm:inline font-light">&rarr;</span>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">{selectedCount}</span>
                    <span className="text-xs">selected</span>
                  </div>
                </>
              )}

              {awaitingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-500 ml-2">
                  <Clock className="h-3 w-3" />{awaitingCount} pending
                </span>
              )}

              {/* Add resumes button — pushed to right, only when job is active */}
              {canUpload && (
                <button
                  onClick={() => { setShowUpload(v => !v); setUploadError(''); setUploadSuccess(''); }}
                  className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {showUpload ? 'Close' : hasAnyCandidates ? 'Add Resumes' : 'Upload Resumes'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload panel (collapsible, only when active) ── */}
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
              {selectedCount > 0 && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-200">
                  {selectedCount} selected
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-red-200">
                  {rejectedCount} rejected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {awaitingCount > 0 && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />{awaitingCount} awaiting interview
                </p>
              )}
              <ExportButton applications={scored} jobTitle={job.title} />
            </div>
          </div>
          <div className="space-y-2.5">
            {scored.map((app, i) => (
              <CandidateRow key={app.id} app={app} rank={i + 1} jobStatus={job.status} onChanged={refetch} />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {applications.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-16">
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">
            {isTerminal ? 'No candidates were added to this position' : 'No candidates yet'}
          </p>
          {!isTerminal && (
            <p className="text-sm text-gray-400 mt-1">Upload resumes above to start scoring</p>
          )}
        </div>
      )}
    </div>
  );
}
