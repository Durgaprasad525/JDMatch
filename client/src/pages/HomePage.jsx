import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { Brain, Upload, CheckCircle } from 'lucide-react';

export function HomePage() {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (jobDescriptionFile && cvFile) {
      navigate('/analysis', { 
        state: { 
          jobDescriptionFile, 
          cvFile 
        } 
      });
    }
  };

  const canAnalyze = jobDescriptionFile && cvFile;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <Brain className="h-12 w-12 text-primary-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI-Powered Job Matching
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload a job description and CV to get an intelligent analysis of how well the candidate matches the position.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Job Description</h2>
          </div>
          <FileUpload
            file={jobDescriptionFile}
            onFileSelect={setJobDescriptionFile}
            accept=".pdf"
            label="Upload Job Description PDF"
          />
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <Upload className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">CV/Resume</h2>
          </div>
          <FileUpload
            file={cvFile}
            onFileSelect={setCvFile}
            accept=".pdf"
            label="Upload CV/Resume PDF"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze || isUploading}
          className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Analyze Match</span>
            </div>
          )}
        </button>
        
        {canAnalyze && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Ready to analyze</span>
          </div>
        )}
      </div>

      <div className="mt-16 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <div className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <div className="font-medium">Upload Documents</div>
              <div>Upload both the job description and candidate's CV as PDF files</div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <div className="font-medium">AI Analysis</div>
              <div>Our AI analyzes both documents to identify strengths, weaknesses, and alignment</div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <div className="font-medium">Get Results</div>
              <div>Receive a comprehensive analysis with scores, recommendations, and insights</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
