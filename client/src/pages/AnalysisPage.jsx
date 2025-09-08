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
      // Update local state directly when success callback fires
      let analysisData = data.data || data;
      
      // Check if the summary contains JSON that needs to be parsed
      if (analysisData.summary && analysisData.summary.includes('```json')) {
        try {
          // Extract JSON from the code block
          const jsonMatch = analysisData.summary.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[1]);
            
            // Merge the parsed data with existing data, prioritizing parsed data
            analysisData = {
              ...analysisData,
              ...parsedJson,
              // Use existing alignment scores if they're already in the correct format
              alignment: parsedJson.alignment || analysisData.alignment
            };
          }
        } catch (error) {
          // Error parsing JSON, continue with original data
        }
      }
      
      setAnalysisData(analysisData);
      
      // Store analysis data in localStorage for page refresh
      localStorage.setItem('analysisData', JSON.stringify(analysisData));
    },
    onError: (error) => {
      // Handle error
    },
    onSettled: (data, error) => {
      // Mutation completed
    },
    retry: false,
    retryDelay: 0
  });

  useEffect(() => {
    // Check for files in location.state first
    if (location.state?.jobDescriptionFile && location.state?.cvFile && !hasAnalyzed.current) {
      setJobDescriptionFile(location.state.jobDescriptionFile);
      setCvFile(location.state.cvFile);
      
      // Store files in localStorage for page refresh
      localStorage.setItem('jobDescriptionFile', location.state.jobDescriptionFile);
      localStorage.setItem('cvFile', location.state.cvFile);
      
      // Mark as analyzed to prevent re-triggering
      hasAnalyzed.current = true;
      
      // Start analysis with full data
      
      analyzeMutation.mutate({
        jobDescriptionFile: location.state.jobDescriptionFile,
        cvFile: location.state.cvFile,
      });
    } 
    // Check localStorage for files (page refresh scenario)
    else if (localStorage.getItem('jobDescriptionFile') && localStorage.getItem('cvFile') && !hasAnalyzed.current) {
      const storedJobFile = localStorage.getItem('jobDescriptionFile');
      const storedCvFile = localStorage.getItem('cvFile');
      
      setJobDescriptionFile(storedJobFile);
      setCvFile(storedCvFile);
      
      // Mark as analyzed to prevent re-triggering
      hasAnalyzed.current = true;
      
      
      analyzeMutation.mutate({
        jobDescriptionFile: storedJobFile,
        cvFile: storedCvFile,
      });
    }
    // Check if we have analysis data in localStorage (already analyzed)
    else if (localStorage.getItem('analysisData') && !hasAnalyzed.current) {
      try {
        const storedAnalysisData = JSON.parse(localStorage.getItem('analysisData'));
        setAnalysisData(storedAnalysisData);
        hasAnalyzed.current = true;
      } catch (error) {
        localStorage.removeItem('analysisData');
      }
    }
    // No files available, redirect to home
    else if (!location.state?.jobDescriptionFile && !location.state?.cvFile && !localStorage.getItem('jobDescriptionFile')) {
      navigate('/');
    }
  }, [location.state, navigate]);

  // Note: We now handle data updates directly in the onSuccess callback

  const handleBack = () => {
    // Clear localStorage when going back
    localStorage.removeItem('jobDescriptionFile');
    localStorage.removeItem('cvFile');
    localStorage.removeItem('analysisData');
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


  // Check if we have analysis data in local state
  if (analysisData) {
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
