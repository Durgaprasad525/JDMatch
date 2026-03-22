import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Brain, CheckCircle, AlertCircle, Loader, Video, VideoOff } from 'lucide-react';
import { trpc } from '../utils/trpc';

const STAGES = {
  LOADING:    'loading',
  READY:      'ready',
  CONNECTING: 'connecting',
  ACTIVE:     'active',
  ENDED:      'ended',
  ERROR:      'error',
};

function StatusDot({ active }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
      active ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
    }`} />
  );
}

export function InterviewPage() {
  const { token } = useParams();
  const vapiRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [stage, setStage] = useState(STAGES.LOADING);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const transcriptRef = useRef(null);

  const { data: interview, isLoading, error: fetchError } = trpc.interviews.getByToken.useQuery(
    { token },
    { retry: false }
  );

  const startCallMutation = trpc.interviews.startCall.useMutation();
  const logSignalMutation = trpc.interviews.logSignal.useMutation();

  // Start webcam when interview becomes active
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

  // Detect camera track ending (user turns off camera)
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

  // Anti-cheat: track tab switches
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

  // Anti-cheat: track copy-paste
  useEffect(() => {
    if (stage !== STAGES.ACTIVE) return;
    const handlePaste = () => logSignalMutation.mutate({ token, type: 'COPY_PASTE' });
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [stage, token]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    if (!isLoading && !fetchError && interview) {
      setStage(interview.status === 'COMPLETED' ? STAGES.ENDED : STAGES.READY);
    }
    if (fetchError) setStage(STAGES.ERROR);
  }, [isLoading, fetchError, interview]);

  const startInterview = async () => {
    if (!interview?.vapiPublicKey || !interview?.vapiAssistantId) {
      setError('Interview configuration is missing. Please contact the company.');
      setStage(STAGES.ERROR);
      return;
    }

    setStage(STAGES.CONNECTING);
    try {
      // Dynamically import Vapi SDK
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(interview.vapiPublicKey);
      vapiRef.current = vapi;

      // Listen for events
      vapi.on('call-start', () => setStage(STAGES.ACTIVE));
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

      // Start the call
      const call = await vapi.start(interview.vapiAssistantId, {
        variableValues: {
          jobTitle: interview.jobTitle,
          companyName: interview.companyName,
          candidateName: interview.candidateName,
          jobDescription: interview.jobDescription?.slice(0, 1000),
        },
      });

      // Save call ID so webhook can match it
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

  // ── Loading ────────────────────────────────────────────────
  if (stage === STAGES.LOADING || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (stage === STAGES.ERROR || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500">{error || 'This interview link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  // ── Completed ─────────────────────────────────────────────
  if (stage === STAGES.ENDED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Complete!</h2>
          <p className="text-gray-500 mb-1">
            Thank you, <strong>{interview?.candidateName}</strong>.
          </p>
          <p className="text-gray-500">
            Your interview for <strong>{interview?.jobTitle}</strong> at{' '}
            <strong>{interview?.companyName}</strong> has been submitted.
            The hiring team will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready / Connecting / Active ───────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-xl">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">{interview?.jobTitle}</p>
            <p className="text-sm text-gray-400">{interview?.companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <StatusDot active={stage === STAGES.ACTIVE} />
          {stage === STAGES.ACTIVE ? 'Interview in progress' :
           stage === STAGES.CONNECTING ? 'Connecting...' : 'Ready to start'}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {/* Video feed + AI avatar side by side */}
        <div className="flex items-center gap-6">
          {/* Candidate webcam */}
          <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
            />
            {!cameraOn && <VideoOff className="h-8 w-8 text-gray-600" />}
            <span className="absolute bottom-1 left-1 text-xs text-gray-400 bg-black/50 px-1 rounded">You</span>
          </div>

          {/* AI avatar */}
          <div className={`relative w-28 h-28 rounded-full flex items-center justify-center ${
            stage === STAGES.ACTIVE
              ? 'bg-primary-600 shadow-lg shadow-primary-900/50'
              : 'bg-gray-700'
          }`}>
            <Brain className={`h-12 w-12 ${stage === STAGES.ACTIVE ? 'text-white' : 'text-gray-400'}`} />
            {stage === STAGES.ACTIVE && (
              <span className="absolute -inset-1 rounded-full border-2 border-primary-400 animate-ping opacity-30" />
            )}
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">
            {stage === STAGES.READY ? `Hi, ${interview?.candidateName}!` :
             stage === STAGES.CONNECTING ? 'Connecting to your interviewer...' :
             'AI Interviewer'}
          </h1>
          <p className="text-gray-400 text-sm max-w-sm">
            {stage === STAGES.READY
              ? 'Your AI interview will be conversational. Speak naturally and take your time with answers.'
              : stage === STAGES.ACTIVE
              ? 'Speak clearly. The interview is being recorded and transcribed.'
              : ''}
          </p>
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div
            ref={transcriptRef}
            className="w-full max-w-lg h-48 overflow-y-auto rounded-xl bg-gray-800 p-4 space-y-2"
          >
            {transcript.filter(t => t.final).map((t, i) => (
              <div key={i} className={`text-sm ${t.role === 'assistant' ? 'text-blue-300' : 'text-white'}`}>
                <span className="font-medium opacity-60 mr-2">
                  {t.role === 'assistant' ? 'AI' : 'You'}:
                </span>
                {t.text}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4 mt-4">
          {stage === STAGES.READY && (
            <button
              onClick={startInterview}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors"
            >
              <Mic className="h-5 w-5" />
              Start Interview
            </button>
          )}

          {stage === STAGES.CONNECTING && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader className="h-5 w-5 animate-spin" />
              Connecting...
            </div>
          )}

          {stage === STAGES.ACTIVE && (
            <>
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-full transition-colors ${
                  !cameraOn ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  isMuted ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <button
                onClick={endInterview}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                title="End interview"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {stage === STAGES.READY && (
          <p className="text-xs text-gray-600 max-w-sm text-center">
            By starting the interview, you consent to this session being recorded and analyzed by AI.
          </p>
        )}
      </div>
    </div>
  );
}
