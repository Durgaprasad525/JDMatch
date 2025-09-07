import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import { AnalysisResults } from '../components/AnalysisResults';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const hasAnalyzed = useRef(false);

  const analyzeMutation = trpc.analysis.uploadAndAnalyze.useMutation({
    onSuccess: (data) => {
      console.log('🔍 tRPC Mutation Success:', data);
      // Update local state directly when success callback fires
      let analysisData = data.data || data;
      
      // Check if the summary contains JSON that needs to be parsed
      if (analysisData.summary && analysisData.summary.includes('```json')) {
        console.log('🔍 Parsing JSON from AI response summary');
        try {
          // Extract JSON from the code block
          const jsonMatch = analysisData.summary.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[1]);
            console.log('🔍 Parsed JSON from summary:', parsedJson);
            analysisData = parsedJson;
          }
        } catch (error) {
          console.error('🔍 Error parsing JSON from summary:', error);
        }
      }
      
      setAnalysisData(analysisData);
    },
    onError: (error) => {
      console.log('🔍 tRPC Mutation Error:', error);
    },
    onSettled: (data, error) => {
      console.log('🔍 tRPC Mutation Settled:', { data, error });
    },
    retry: false,
    retryDelay: 0
  });

  useEffect(() => {
    if (location.state?.jobDescriptionFile && location.state?.cvFile && !hasAnalyzed.current) {
      setJobDescriptionFile(location.state.jobDescriptionFile);
      setCvFile(location.state.cvFile);
      
      // Mark as analyzed to prevent re-triggering
      hasAnalyzed.current = true;
      
      // Start analysis with full data
      console.log('🔍 Starting tRPC mutation with data:', {
        jobDescriptionFileLength: location.state.jobDescriptionFile?.length,
        cvFileLength: location.state.cvFile?.length,
        jobDescriptionFilePreview: location.state.jobDescriptionFile?.substring(0, 100),
        cvFilePreview: location.state.cvFile?.substring(0, 100)
      });
      
      analyzeMutation.mutate({
        jobDescriptionFile: location.state.jobDescriptionFile,
        cvFile: location.state.cvFile,
      });
    } else if (!location.state?.jobDescriptionFile || !location.state?.cvFile) {
      // Redirect to home if no files
      navigate('/');
    }
  }, [location.state, navigate]);

  // Note: We now handle data updates directly in the onSuccess callback

  const handleBack = () => {
    navigate('/');
  };

  const handleRetry = () => {
    if (jobDescriptionFile && cvFile) {
      analyzeMutation.mutate({
        jobDescriptionFile,
        cvFile,
      });
    }
  };

  // Debug: Log all mutation states
  console.log('🔍 AnalysisPage - Mutation states:', {
    isLoading: analyzeMutation.isLoading,
    isSuccess: analyzeMutation.isSuccess,
    isError: analyzeMutation.isError,
    data: analyzeMutation.data,
    error: analyzeMutation.error,
    status: analyzeMutation.status,
    localAnalysisData: analysisData
  });

  // Check if we have analysis data in local state
  if (analysisData) {
    console.log('🔍 AnalysisPage - Rendering with local analysis data:', analysisData);
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </button>
        </div>
        <AnalysisResults data={analysisData} />
      </div>
    );
  }

  if (analyzeMutation.error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </button>
        </div>
        <ErrorMessage 
          error={analyzeMutation.error} 
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (analyzeMutation.isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </button>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Upload</span>
        </button>
      </div>
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analysis data available</p>
      </div>
    </div>
  );
}
