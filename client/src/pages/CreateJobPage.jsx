import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeft, PenLine, Upload, Sparkles, Briefcase,
  ChevronRight, FileText, Wand2, AlertCircle, CheckCircle,
  Building2, MapPin, Clock, GraduationCap, Wrench, StickyNote,
} from 'lucide-react';
import { trpc } from '../utils/trpc';

const TABS = [
  { id: 'write',  label: 'Write',         icon: PenLine, desc: 'Write or paste your job description' },
  { id: 'upload', label: 'Upload PDF',    icon: Upload,  desc: 'Upload an existing JD document' },
  { id: 'ai',     label: 'Generate with AI', icon: Sparkles, desc: 'AI writes it for you from a few inputs' },
];

const EXP_LEVELS = ['Intern', 'Entry-Level', 'Mid-Level', 'Senior', 'Lead', 'Staff', 'Principal', 'Director', 'VP', 'C-Level'];
const EMP_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
        active
          ? 'border-primary-500 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className={`p-2.5 rounded-lg ${active ? 'bg-primary-100' : 'bg-gray-100'}`}>
        <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-gray-600'}`}>
        {tab.label}
      </span>
      <span className="text-xs text-gray-400 text-center leading-tight">{tab.desc}</span>
    </button>
  );
}

function WriteTab({ description, setDescription }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Job Description <span className="text-red-400">*</span>
      </label>
      <textarea
        rows={14}
        className="input-field resize-none font-mono text-sm leading-relaxed"
        placeholder={`Role Overview\nWe are looking for a skilled Software Engineer to join our team...\n\nKey Responsibilities\n• Design and implement scalable APIs\n• Collaborate with product and design teams\n• Write clean, maintainable code\n\nRequired Qualifications\n• 3+ years of experience with React & Node.js\n• Strong understanding of REST APIs\n• Experience with PostgreSQL or similar databases`}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {description.length > 0 ? `${description.split(/\s+/).filter(Boolean).length} words` : 'Paste or type your full job description'}
        </p>
        {description.length >= 50 && (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> Ready
          </span>
        )}
      </div>
    </div>
  );
}

function UploadTab({ description, setDescription, uploadError, setUploadError }) {
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);

  const parseJD = trpc.jobs.parseJDFile.useMutation({
    onSuccess: (res) => {
      setDescription(res.text);
      setParsing(false);
    },
    onError: (err) => {
      setUploadError(err.message);
      setParsing(false);
    },
  });

  const onDrop = useCallback(async (files) => {
    setUploadError('');
    if (!files.length) return;
    const file = files[0];
    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      parseJD.mutate({ file: base64 });
    };
    reader.onerror = () => {
      setUploadError('Failed to read file.');
      setParsing(false);
    };
    reader.readAsDataURL(file);
  }, [parseJD, setUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  if (description && !parsing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName || 'Uploaded JD'}</p>
              <p className="text-xs text-green-600 font-medium">Extracted successfully</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setDescription(''); setFileName(''); }}
            className="text-xs text-gray-400 hover:text-red-500 font-medium"
          >
            Remove
          </button>
        </div>
        <textarea
          rows={10}
          className="input-field resize-none text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-400">
          You can edit the extracted text above before creating the job.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            <p className="text-sm font-medium text-gray-600">Extracting text from PDF...</p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-gray-100 rounded-xl inline-block mb-3">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              {isDragActive ? 'Drop your JD here' : 'Drag & drop your Job Description PDF'}
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse · PDF format</p>
          </>
        )}
      </div>
      {uploadError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{uploadError}
        </div>
      )}
    </div>
  );
}

function AITab({ description, setDescription, onTitleGenerated }) {
  const [aiForm, setAIForm] = useState({
    title: '',
    department: '',
    experienceLevel: 'Mid-Level',
    skills: '',
    location: '',
    employmentType: 'Full-time',
    additionalNotes: '',
  });
  const [generated, setGenerated] = useState(false);

  const generateJD = trpc.jobs.generateJD.useMutation({
    onSuccess: (res) => {
      setDescription(res.description);
      setGenerated(true);
      // Auto-fill the job title from the AI form's role title
      if (aiForm.title.trim() && onTitleGenerated) {
        onTitleGenerated(aiForm.title.trim());
      }
    },
  });

  const handleGenerate = () => {
    if (!aiForm.title.trim()) return;
    generateJD.mutate(aiForm);
  };

  if (generated && description) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">AI-Generated JD</p>
              <p className="text-xs text-purple-600 font-medium">Review and edit below</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setDescription(''); setGenerated(false); }}
            className="text-xs text-gray-400 hover:text-purple-600 font-medium"
          >
            Regenerate
          </button>
        </div>
        <textarea
          rows={14}
          className="input-field resize-none text-sm leading-relaxed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-400">
          Edit the generated text above to match your exact requirements.
        </p>
      </div>
    );
  }

  const inputCls = "input-field text-sm";

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Fill in a few details and AI will generate a professional job description for you.
      </p>

      {/* Role title — required */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
          <Briefcase className="h-3.5 w-3.5 text-gray-400" />
          Role Title <span className="text-red-400">*</span>
        </label>
        <input
          className={inputCls}
          placeholder="e.g. Senior Frontend Engineer"
          value={aiForm.title}
          onChange={(e) => setAIForm(f => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            Department
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Engineering, Marketing"
            value={aiForm.department}
            onChange={(e) => setAIForm(f => ({ ...f, department: e.target.value }))}
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            Location
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Remote, Bangalore, NYC"
            value={aiForm.location}
            onChange={(e) => setAIForm(f => ({ ...f, location: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
            Experience Level
          </label>
          <select
            className={inputCls}
            value={aiForm.experienceLevel}
            onChange={(e) => setAIForm(f => ({ ...f, experienceLevel: e.target.value }))}
          >
            {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            Employment Type
          </label>
          <select
            className={inputCls}
            value={aiForm.employmentType}
            onChange={(e) => setAIForm(f => ({ ...f, employmentType: e.target.value }))}
          >
            {EMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
          <Wrench className="h-3.5 w-3.5 text-gray-400" />
          Key Skills & Technologies
        </label>
        <input
          className={inputCls}
          placeholder="e.g. React, Node.js, PostgreSQL, AWS, TypeScript"
          value={aiForm.skills}
          onChange={(e) => setAIForm(f => ({ ...f, skills: e.target.value }))}
        />
        <p className="text-xs text-gray-400 mt-1">Comma separated — AI will incorporate these into the JD</p>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
          <StickyNote className="h-3.5 w-3.5 text-gray-400" />
          Additional Notes
        </label>
        <textarea
          rows={3}
          className="input-field resize-none text-sm"
          placeholder="Any specific requirements, culture notes, or details the AI should include..."
          value={aiForm.additionalNotes}
          onChange={(e) => setAIForm(f => ({ ...f, additionalNotes: e.target.value }))}
        />
      </div>

      {generateJD.error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{generateJD.error.message}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!aiForm.title.trim() || generateJD.isLoading}
        className="btn-primary flex items-center gap-2 w-full justify-center py-3"
      >
        {generateJD.isLoading ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            Generating job description...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Generate Job Description
          </>
        )}
      </button>
    </div>
  );
}

export function CreateJobPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('write');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');

  const createJob = trpc.jobs.create.useMutation({
    onSuccess: (job) => {
      navigate(`/jobs/${job.id}`);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Job title is required.'); return; }
    if (description.trim().length < 10) { setError('Job description must be at least 10 characters.'); return; }
    createJob.mutate({ title: title.trim(), description: description.trim(), status });
  };

  const canSubmit = title.trim().length > 0 && description.trim().length >= 10;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />Back to Dashboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Job Posting</h1>
        <p className="text-gray-500 mt-1">
          Define the role and job description to start screening candidates
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Job Title */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Job Title <span className="text-red-400">*</span>
          </label>
          <input
            required
            className="input-field text-lg font-medium"
            placeholder="e.g. Senior Software Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* JD Source Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900 mb-4">
            Job Description <span className="text-red-400">*</span>
          </label>

          {/* Tab selector */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {TABS.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Don't clear description when switching — let users keep their work
                  setUploadError('');
                }}
              />
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[240px]">
            {activeTab === 'write' && (
              <WriteTab description={description} setDescription={setDescription} />
            )}
            {activeTab === 'upload' && (
              <UploadTab
                description={description}
                setDescription={setDescription}
                uploadError={uploadError}
                setUploadError={setUploadError}
              />
            )}
            {activeTab === 'ai' && (
              <AITab
                description={description}
                setDescription={setDescription}
                onTitleGenerated={(t) => { if (!title.trim()) setTitle(t); }}
              />
            )}
          </div>
        </div>

        {/* Status + Submit */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900">
                Posting Status
              </label>
              <p className="text-xs text-gray-400 mt-0.5">Control whether candidates can see this job</p>
            </div>
            <select
              className="input-field w-auto text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active — accepting applications</option>
              <option value="DRAFT">Draft — not visible yet</option>
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || createJob.isLoading}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            >
              {createJob.isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Briefcase className="h-4 w-4" />
                  Create Job Posting
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
