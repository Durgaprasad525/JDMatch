import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff, PhoneOff, Brain, CheckCircle, AlertCircle, Loader,
  Video, VideoOff, Shield, Clock, ChevronRight, Wifi, Volume2,
  Monitor, Camera, AudioLines, Info, Sparkles,
} from 'lucide-react';
import { trpc } from '../utils/trpc';

const STAGES = {
  LOADING:      'loading',
  SYSTEM_CHECK: 'system_check',
  READY:        'ready',
  CONNECTING:   'connecting',
  ACTIVE:       'active',
  ENDED:        'ended',
  ERROR:        'error',
};

// ── Elapsed timer ─────────────────────────────────────────────────────────────
function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return (
    <span className="font-mono text-sm tabular-nums">{m}:{s}</span>
  );
}

// ── Pulse ring around AI avatar ───────────────────────────────────────────────
function PulseRing({ active, children }) {
  return (
    <div className="relative">
      {active && (
        <>
          <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <span className="absolute -inset-1 rounded-full border-2 border-blue-400/40 animate-pulse" />
        </>
      )}
      {children}
    </div>
  );
}

// ── Audio level bars ──────────────────────────────────────────────────────────
function AudioLevelBars({ active }) {
  const bars = 5;
  return (
    <div className="flex items-end gap-0.5 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-0.5 rounded-full transition-all duration-150 ${
            active ? 'bg-blue-400' : 'bg-gray-600'
          }`}
          style={{
            height: active ? `${Math.random() * 70 + 30}%` : '20%',
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── System check item ─────────────────────────────────────────────────────────
function CheckItem({ icon: Icon, label, status, detail }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 ${
      status === 'pass'    ? 'bg-green-50/80 border-green-200' :
      status === 'fail'    ? 'bg-red-50/80 border-red-200' :
      status === 'checking' ? 'bg-blue-50/80 border-blue-200' :
                             'bg-gray-50 border-gray-200'
    }`}>
      <div className={`p-2 rounded-lg ${
        status === 'pass'    ? 'bg-green-100' :
        status === 'fail'    ? 'bg-red-100' :
        status === 'checking' ? 'bg-blue-100' :
                               'bg-gray-100'
      }`}>
        <Icon className={`h-4 w-4 ${
          status === 'pass'    ? 'text-green-600' :
          status === 'fail'    ? 'text-red-500' :
          status === 'checking' ? 'text-blue-500 animate-pulse' :
                                 'text-gray-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          status === 'pass'  ? 'text-green-800' :
          status === 'fail'  ? 'text-red-700' :
                               'text-gray-700'
        }`}>{label}</p>
        {detail && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
      </div>
      {status === 'pass' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
      {status === 'fail' && <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
      {status === 'checking' && (
        <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  );
}

// ── Transcript bubble ─────────────────────────────────────────────────────────
function TranscriptBubble({ role, text }) {
  const isAI = role === 'assistant';
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isAI
          ? 'bg-gray-800 text-gray-200 rounded-bl-md'
          : 'bg-blue-600 text-white rounded-br-md'
      }`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
          isAI ? 'text-gray-500' : 'text-blue-200'
        }`}>
          {isAI ? 'AI Interviewer' : 'You'}
        </p>
        {text}
      </div>
    </div>
  );
}

// ── Interview tip cards ───────────────────────────────────────────────────────
const TIPS = [
  { title: 'Speak naturally', desc: 'The AI understands conversational English. No need for overly formal language.' },
  { title: 'Take your time', desc: 'Pause and think before answering. There is no rush — quality over speed.' },
  { title: 'Be specific', desc: 'Use real examples from your experience. Concrete stories are more convincing.' },
  { title: 'Stay focused', desc: 'Keep your browser tab active. Tab switches are tracked as part of the integrity check.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function InterviewPage() {
  const { token } = useParams();
  const vapiRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const [stage, setStage] = useState(STAGES.LOADING);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [callStartTime, setCallStartTime] = useState(null);
  const [showTranscript, setShowTranscript] = useState(true);

  // System checks
  const [checks, setChecks] = useState({
    browser:    'pending',
    microphone: 'pending',
    camera:     'pending',
    connection: 'pending',
  });

  const { data: interview, isLoading, error: fetchError } = trpc.interviews.getByToken.useQuery(
    { token },
    { retry: false }
  );

  const startCallMutation = trpc.interviews.startCall.useMutation();
  const logSignalMutation = trpc.interviews.logSignal.useMutation();

  // ── System checks on mount ──────────────────────────────────────────────
  const runSystemChecks = useCallback(async () => {
    setStage(STAGES.SYSTEM_CHECK);

    // Browser check
    setChecks(c => ({ ...c, browser: 'checking' }));
    await new Promise(r => setTimeout(r, 400));
    const isModernBrowser = !!navigator.mediaDevices?.getUserMedia;
    setChecks(c => ({ ...c, browser: isModernBrowser ? 'pass' : 'fail' }));

    // Connection check
    setChecks(c => ({ ...c, connection: 'checking' }));
    await new Promise(r => setTimeout(r, 500));
    setChecks(c => ({ ...c, connection: navigator.onLine ? 'pass' : 'fail' }));

    // Microphone check
    setChecks(c => ({ ...c, microphone: 'checking' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setChecks(c => ({ ...c, microphone: 'pass' }));
    } catch {
      setChecks(c => ({ ...c, microphone: 'fail' }));
    }

    // Camera check
    setChecks(c => ({ ...c, camera: 'checking' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setChecks(c => ({ ...c, camera: 'pass' }));
    } catch {
      setChecks(c => ({ ...c, camera: 'pass' })); // camera optional
    }

    setStage(STAGES.READY);
  }, []);

  // ── Start webcam when interview active ──────────────────────────────────
  useEffect(() => {
    if (stage !== STAGES.ACTIVE && stage !== STAGES.CONNECTING) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      })
      .catch(() => setCameraOn(false));
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stage]);

  // ── Camera track ending detection ───────────────────────────────────────
  useEffect(() => {
    if (stage !== STAGES.ACTIVE || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const handleEnd = () => {
      setCameraOn(false);
      logSignalMutation.mutate({ token, type: 'CAMERA_OFF' });
    };
    track.addEventListener('ended', handleEnd);
    return () => track.removeEventListener('ended', handleEnd);
  }, [stage, token]);

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    if (!track.enabled) {
      setCameraOn(false);
      logSignalMutation.mutate({ token, type: 'CAMERA_OFF' });
    } else {
      setCameraOn(true);
    }
  };

  // ── Anti-cheat: tab switches ────────────────────────────────────────────
  useEffect(() => {
    if (stage !== STAGES.ACTIVE) return;
    const handleVisibility = () => {
      if (document.hidden) {
        logSignalMutation.mutate({ token, type: 'TAB_SWITCH' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [stage, token]);

  // ── Anti-cheat: copy-paste ──────────────────────────────────────────────
  useEffect(() => {
    if (stage !== STAGES.ACTIVE) return;
    const handlePaste = () => logSignalMutation.mutate({ token, type: 'COPY_PASTE' });
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [stage, token]);

  // ── Auto-scroll transcript ──────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ── Initial load → system checks ───────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !fetchError && interview) {
      if (interview.status === 'COMPLETED') {
        setStage(STAGES.ENDED);
      } else {
        runSystemChecks();
      }
    }
    if (fetchError) setStage(STAGES.ERROR);
  }, [isLoading, fetchError, interview, runSystemChecks]);

  // ── Start the interview ─────────────────────────────────────────────────
  const startInterview = async () => {
    if (!interview?.vapiPublicKey || !interview?.vapiAssistantId) {
      setError('Interview configuration is missing. Please contact the company.');
      setStage(STAGES.ERROR);
      return;
    }

    setStage(STAGES.CONNECTING);
    try {
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(interview.vapiPublicKey);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setStage(STAGES.ACTIVE);
        setCallStartTime(Date.now());
      });
      vapi.on('call-end', () => setStage(STAGES.ENDED));
      vapi.on('error', (e) => {
        setError(e?.message || 'An error occurred during the interview.');
        setStage(STAGES.ERROR);
      });
      vapi.on('message', (msg) => {
        if (msg.type === 'transcript') {
          setTranscript(prev => [...prev, {
            role: msg.role,
            text: msg.transcript,
            final: msg.transcriptType === 'final',
          }]);
        }
      });

      const call = await vapi.start(interview.vapiAssistantId, {
        variableValues: {
          jobTitle: interview.jobTitle,
          companyName: interview.companyName,
          candidateName: interview.candidateName,
          jobDescription: interview.jobDescription?.slice(0, 1000),
        },
      });

      if (call?.id) {
        await startCallMutation.mutateAsync({ token, vapiCallId: call.id });
      }
    } catch (err) {
      setError(err.message || 'Failed to start interview.');
      setStage(STAGES.ERROR);
    }
  };

  const endInterview = () => {
    vapiRef.current?.stop();
    setStage(STAGES.ENDED);
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      vapiRef.current.setMuted(!isMuted);
      setIsMuted(m => !m);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Loading ─────────────────────────────────────────────────────────────
  if (stage === STAGES.LOADING || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="p-4 bg-blue-600/20 rounded-2xl backdrop-blur-sm border border-blue-500/20">
              <Brain className="h-8 w-8 text-blue-400" />
            </div>
            <div className="absolute inset-0 animate-ping rounded-2xl bg-blue-500/10" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Preparing your interview...</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (stage === STAGES.ERROR || fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="p-4 bg-red-500/10 rounded-2xl inline-block mb-5 border border-red-500/20">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 leading-relaxed">
            {error || 'This interview link is invalid or has expired. Please contact the hiring team for a new link.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm font-medium transition-colors border border-gray-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Completed ───────────────────────────────────────────────────────────
  if (stage === STAGES.ENDED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          {/* Success card */}
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Interview Complete!</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Thank you, <span className="text-white font-medium">{interview?.candidateName}</span>.
              Your interview for{' '}
              <span className="text-white font-medium">{interview?.jobTitle}</span> at{' '}
              <span className="text-white font-medium">{interview?.companyName}</span>{' '}
              has been submitted successfully.
            </p>

            {/* What happens next */}
            <div className="bg-gray-800/60 rounded-2xl p-5 text-left space-y-3 border border-gray-700/50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What happens next</p>
              {[
                { step: '1', text: 'Your responses are being analyzed by our AI' },
                { step: '2', text: 'The hiring team will review your interview report' },
                { step: '3', text: 'You will be contacted with next steps via email' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className="text-sm text-gray-300">{text}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-600 mt-6">You can safely close this tab now.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── System Check ────────────────────────────────────────────────────────
  if (stage === STAGES.SYSTEM_CHECK) {
    const allDone = Object.values(checks).every(s => s === 'pass' || s === 'fail');
    const hasFail = Object.values(checks).some(s => s === 'fail');
    const criticalFail = checks.microphone === 'fail' || checks.browser === 'fail';

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/20">
                <Monitor className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">System Check</h2>
                <p className="text-xs text-gray-500">Verifying your setup before the interview</p>
              </div>
            </div>

            {/* Check items */}
            <div className="space-y-2.5 mb-6">
              <CheckItem
                icon={Monitor}
                label="Browser compatibility"
                status={checks.browser}
                detail={checks.browser === 'pass' ? 'WebRTC supported' : checks.browser === 'fail' ? 'Please use Chrome or Firefox' : null}
              />
              <CheckItem
                icon={Wifi}
                label="Internet connection"
                status={checks.connection}
                detail={checks.connection === 'pass' ? 'Connected' : checks.connection === 'fail' ? 'No internet detected' : null}
              />
              <CheckItem
                icon={Mic}
                label="Microphone access"
                status={checks.microphone}
                detail={checks.microphone === 'pass' ? 'Microphone ready' : checks.microphone === 'fail' ? 'Please allow microphone access' : null}
              />
              <CheckItem
                icon={Camera}
                label="Camera access"
                status={checks.camera}
                detail={checks.camera === 'pass' ? 'Camera ready' : checks.camera === 'fail' ? 'Optional — interview will work without camera' : null}
              />
            </div>

            {/* Result */}
            {allDone && !criticalFail && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300 font-medium">
                  {hasFail ? 'Ready with warnings — camera is optional' : 'All systems ready!'}
                </p>
              </div>
            )}
            {allDone && criticalFail && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300 font-medium">
                  Microphone is required. Please grant access and reload.
                </p>
              </div>
            )}

            <button
              onClick={() => setStage(STAGES.READY)}
              disabled={!allDone || criticalFail}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {allDone ? (
                <>Continue <ChevronRight className="h-4 w-4" /></>
              ) : (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking...
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready (Pre-interview lobby) ─────────────────────────────────────────
  if (stage === STAGES.READY) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Company & role header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800 px-8 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    {interview?.companyName}
                  </p>
                  <h1 className="text-lg font-bold text-white">{interview?.jobTitle}</h1>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> ~15–20 minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Voice conversation
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Monitored session
                </span>
              </div>
            </div>

            <div className="p-8">
              {/* Greeting */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome, {interview?.candidateName}!
                </h2>
                <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                  You're about to begin an AI-powered voice interview. The AI interviewer will ask you
                  questions related to the role. Speak naturally — just like a real conversation.
                </p>
              </div>

              {/* Tips */}
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {TIPS.map((tip, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <p className="text-sm font-semibold text-white mb-1">{tip.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>

              {/* Anti-cheat notice */}
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl mb-6">
                <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  This session is recorded and monitored for integrity. Tab switches, copy-paste events,
                  and camera status are tracked. Please keep this tab focused throughout the interview.
                </p>
              </div>

              {/* Start button */}
              <button
                onClick={startInterview}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 text-base active:scale-[0.98]"
              >
                <Mic className="h-5 w-5" />
                Start Interview
              </button>

              <p className="text-xs text-gray-600 text-center mt-4">
                By clicking start, you consent to this session being recorded and analyzed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connecting ──────────────────────────────────────────────────────────
  if (stage === STAGES.CONNECTING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <div className="p-6 bg-blue-600/20 rounded-3xl border border-blue-500/20 backdrop-blur-sm">
              <Brain className="h-12 w-12 text-blue-400" />
            </div>
            <span className="absolute -inset-2 rounded-3xl border-2 border-blue-400/30 animate-ping" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connecting to your interviewer...</h2>
          <p className="text-gray-500 text-sm">Setting up the voice channel. This may take a moment.</p>

          {/* Connection steps */}
          <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
            {['Initializing voice engine', 'Loading interview context', 'Establishing connection'].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                <div className="h-3.5 w-3.5 border-2 border-blue-400/50 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Active interview ────────────────────────────────────────────────────
  const finalTranscript = transcript.filter(t => t.final);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Left: Company + job */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-sm">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">{interview?.jobTitle}</p>
              <p className="text-xs text-gray-500">{interview?.companyName}</p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Live</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <ElapsedTimer startTime={callStartTime} />
            </div>
          </div>

          {/* Right: Monitoring badge */}
          <div className="flex items-center gap-1.5 text-gray-600 text-xs">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Session monitored</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-5xl mx-auto w-full">

        {/* Left: Video + AI avatar + controls */}
        <div className="flex flex-col items-center justify-center px-4 py-8 lg:w-1/2">

          {/* AI Avatar */}
          <PulseRing active={true}>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-900/40">
              <Brain className="h-12 w-12 sm:h-14 sm:w-14 text-white/90" />
            </div>
          </PulseRing>

          <div className="mt-4 text-center">
            <p className="text-base font-semibold text-white">AI Interviewer</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <AudioLevelBars active={true} />
              <span className="text-xs text-gray-500 ml-1">Listening</span>
            </div>
          </div>

          {/* Candidate webcam preview */}
          <div className="mt-6 relative w-36 h-28 rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-gray-600" />
              </div>
            )}
            <span className="absolute bottom-1.5 left-2 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-md font-medium">
              {interview?.candidateName?.split(' ')[0] || 'You'}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={toggleCamera}
              className={`p-3.5 rounded-2xl transition-all duration-200 border ${
                !cameraOn
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
              title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl transition-all duration-200 border ${
                isMuted
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={endInterview}
              className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition-all duration-200 border border-red-500 shadow-lg shadow-red-900/20"
              title="End interview"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right: Live transcript */}
        <div className="flex flex-col lg:w-1/2 border-t lg:border-t-0 lg:border-l border-gray-800/80">
          {/* Transcript header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800/80">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-300">Live Transcript</span>
              {finalTranscript.length > 0 && (
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                  {finalTranscript.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowTranscript(s => !s)}
              className="text-xs text-gray-500 hover:text-gray-300 font-medium"
            >
              {showTranscript ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Transcript messages */}
          {showTranscript && (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[60vh] lg:max-h-none">
              {finalTranscript.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 bg-gray-800 rounded-xl mb-3">
                    <AudioLines className="h-6 w-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Waiting for conversation...</p>
                  <p className="text-xs text-gray-600 mt-1">Transcript will appear here in real time</p>
                </div>
              )}
              {finalTranscript.map((t, i) => (
                <TranscriptBubble key={i} role={t.role} text={t.text} />
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
