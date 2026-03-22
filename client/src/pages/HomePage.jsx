import { Link } from 'react-router-dom';
import {
  Brain, Users, Mic, Shield, FileText, Sparkles,
  ArrowRight, CheckCircle, BarChart3, Zap, Building2,
} from 'lucide-react';

function FeatureCard({ icon: Icon, title, desc, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">
      <div className={`p-3 rounded-xl ${color} inline-block mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ num, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">
        {num}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16 md:py-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6 border border-primary-100">
          <Sparkles className="h-4 w-4" />
          AI-Powered Hiring Platform
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Screen, Interview &<br />
          <span className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
            Hire Smarter
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload resumes, let AI score candidates against your job description,
          conduct AI voice interviews, and shortlist — all in one platform.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/register"
            className="btn-primary text-base px-8 py-3.5 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/login"
            className="btn-secondary text-base px-8 py-3.5 flex items-center gap-2"
          >
            Sign In
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-yellow-500" /> Results in seconds
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-blue-500" /> SOC 2 compliant
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="py-16 border-t border-gray-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-500">From job description to final shortlist in 4 simple steps</p>
        </div>

        <div className="grid md:grid-cols-2 gap-x-16 gap-y-8 max-w-3xl mx-auto">
          <StepCard
            num="1"
            title="Create a Job Description"
            desc="Write it yourself, upload an existing PDF, or let AI generate one from a few details."
          />
          <StepCard
            num="2"
            title="Upload Resumes"
            desc="Drag & drop up to 20 candidate resumes. AI scores each one against your JD in seconds."
          />
          <StepCard
            num="3"
            title="AI Voice Interview"
            desc="Invite top candidates. Our AI conducts a structured voice interview and scores performance."
          />
          <StepCard
            num="4"
            title="Review & Shortlist"
            desc="See resume scores, interview results, and anti-cheat signals side by side. Make confident hiring decisions."
          />
        </div>
      </div>

      {/* Features */}
      <div className="py-16 border-t border-gray-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for Enterprise Hiring</h2>
          <p className="text-gray-500">Everything you need to run an end-to-end hiring pipeline</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            icon={Brain}
            title="AI Resume Scoring"
            desc="Intelligent matching against your job requirements. Get scores, strengths, weaknesses, and recommendations."
            color="bg-purple-100 text-purple-600"
          />
          <FeatureCard
            icon={Mic}
            title="AI Voice Interviews"
            desc="Automated voice interviews powered by Vapi. Candidates get a link, AI conducts the interview."
            color="bg-blue-100 text-blue-600"
          />
          <FeatureCard
            icon={Shield}
            title="Anti-Cheat Detection"
            desc="Track tab switches, copy-paste events, and camera-off incidents during interviews."
            color="bg-red-100 text-red-600"
          />
          <FeatureCard
            icon={BarChart3}
            title="Pipeline Analytics"
            desc="Visual pipeline showing screened → invited → interviewed candidates at a glance."
            color="bg-green-100 text-green-600"
          />
          <FeatureCard
            icon={Sparkles}
            title="AI JD Generator"
            desc="Generate professional job descriptions from just a role title and a few keywords."
            color="bg-amber-100 text-amber-600"
          />
          <FeatureCard
            icon={Building2}
            title="Multi-User Teams"
            desc="Invite your hiring team. Company-scoped data with role-based access control."
            color="bg-indigo-100 text-indigo-600"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 border-t border-gray-100">
        <div className="bg-gradient-to-br from-primary-600 to-blue-700 rounded-2xl p-10 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your hiring?</h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Join companies using JDMatch to screen candidates 10x faster with AI-powered insights.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              Start Hiring Smarter
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="border border-primary-300 text-white font-medium px-8 py-3.5 rounded-lg hover:bg-primary-500 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 border-t border-gray-100 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-primary-500" />
          <span className="font-semibold text-gray-500">JDMatch</span>
        </div>
        <p>AI-powered hiring platform</p>
      </div>
    </div>
  );
}
