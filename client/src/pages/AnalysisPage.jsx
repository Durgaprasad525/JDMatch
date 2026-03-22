import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import { AnalysisResults } from '../components/AnalysisResults';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ArrowLeft, AlertCircle, ChevronRight, Award, Mail, User, TrendingUp, CheckCircle2, XCircle, Filter, Users, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';

const STORAGE_KEYS = {
  jobFile: 'jobDescriptionFile',
  cvFiles: 'cvFiles',
  batchResults: 'analysisBatchResults',
};

function normalizeAnalysisData(analysisData) {
  let data = analysisData;
  if (data?.summary?.includes('```json')) {
    try {
      const jsonMatch = data.summary.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        data = { ...data, ...parsed, alignment: parsed.alignment || data.alignment };
      }
    } catch (_) {}
  }
  return data;
}

export function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [cvFiles, setCvFiles] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'good', 'reject'
  const [shortlisted, setShortlisted] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const hasAnalyzed = useRef(false);

  const batchMutation = trpc.analysis.uploadAndAnalyzeBatch.useMutation({
    onSuccess: (response) => {
      try {
        // Handle tRPC response structure: response.data contains the actual data
        const raw = response?.data?.data ?? response?.data ?? response;
        const results = raw?.results ?? [];
        
        if (!Array.isArray(results) || results.length === 0) {
          console.error('Invalid batch results format:', raw);
          throw new Error('No results returned from batch analysis');
        }

        const normalized = results.map((r) => ({
          ...r,
          analysis: normalizeAnalysisData(r.analysis),
        }));
        
        setBatchResults(normalized);
        setSelectedIndex(null);
        
        try {
          localStorage.setItem(STORAGE_KEYS.batchResults, JSON.stringify(normalized));
        } catch (err) {
          console.warn('Failed to save batch results to localStorage:', err);
        }
      } catch (error) {
        console.error('Error processing batch results:', error);
        // This will trigger the error handler
        throw error;
      }
    },
    onError: (error) => {
      console.error('Batch analysis mutation error:', error);
    },
    retry: false,
  });

  useEffect(() => {
    const state = location.state;
    const hasStateFiles = state?.jobDescriptionFile && state?.cvFiles?.length;

    if (hasStateFiles && !hasAnalyzed.current) {
      setJobDescriptionFile(state.jobDescriptionFile);
      setCvFiles(state.cvFiles);
      try {
        localStorage.setItem(STORAGE_KEYS.jobFile, state.jobDescriptionFile);
        localStorage.setItem(STORAGE_KEYS.cvFiles, JSON.stringify(state.cvFiles));
      } catch (_) {}
      hasAnalyzed.current = true;
      batchMutation.mutate({
        jobDescriptionFile: state.jobDescriptionFile,
        cvFiles: state.cvFiles,
      });
      return;
    }

    const storedJob = localStorage.getItem(STORAGE_KEYS.jobFile);
    const storedCvFiles = localStorage.getItem(STORAGE_KEYS.cvFiles);
    const storedBatch = localStorage.getItem(STORAGE_KEYS.batchResults);

    if (storedJob && storedCvFiles && !hasAnalyzed.current) {
      try {
        const parsed = JSON.parse(storedCvFiles);
        if (Array.isArray(parsed) && parsed.length) {
          setJobDescriptionFile(storedJob);
          setCvFiles(parsed);
          hasAnalyzed.current = true;
          batchMutation.mutate({ jobDescriptionFile: storedJob, cvFiles: parsed });
          return;
        }
      } catch (_) {}
    }

    if (storedBatch && !hasAnalyzed.current) {
      try {
        const parsed = JSON.parse(storedBatch);
        if (Array.isArray(parsed) && parsed.length) {
          setBatchResults(parsed);
          hasAnalyzed.current = true;
        }
      } catch (_) {
        localStorage.removeItem(STORAGE_KEYS.batchResults);
      }
    }

    if (!hasStateFiles && !storedJob) {
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleBack = () => {
    [STORAGE_KEYS.jobFile, STORAGE_KEYS.cvFiles, STORAGE_KEYS.batchResults].forEach((k) =>
      localStorage.removeItem(k)
    );
    navigate('/');
  };

  const handleRetry = () => {
    if (jobDescriptionFile && cvFiles?.length) {
      batchMutation.mutate({ jobDescriptionFile, cvFiles });
    }
  };

  const handleSelectCandidate = (index) => {
    setSelectedIndex(index);
  };

  const handleBackToList = () => {
    setSelectedIndex(null);
  };

  const handleShortlist = (cvIndex, e) => {
    e.stopPropagation();
    setShortlisted(prev => {
      const next = new Set(prev);
      if (next.has(cvIndex)) {
        next.delete(cvIndex);
      } else {
        next.add(cvIndex);
        rejected.delete(cvIndex);
      }
      return next;
    });
    setRejected(prev => {
      const next = new Set(prev);
      next.delete(cvIndex);
      return next;
    });
  };

  const handleReject = (cvIndex, e) => {
    e.stopPropagation();
    setRejected(prev => {
      const next = new Set(prev);
      if (next.has(cvIndex)) {
        next.delete(cvIndex);
      } else {
        next.add(cvIndex);
        shortlisted.delete(cvIndex);
      }
      return next;
    });
    setShortlisted(prev => {
      const next = new Set(prev);
      next.delete(cvIndex);
      return next;
    });
  };

  const selectedResult = selectedIndex != null ? batchResults?.[selectedIndex] : null;
  const showingDetail = selectedIndex != null && selectedResult != null;

  // Calculate statistics
  const getCandidateStats = () => {
    if (!batchResults) return null;
    const goodFits = batchResults.filter(r => r.overallScore >= 60).length;
    const moderate = batchResults.filter(r => r.overallScore >= 40 && r.overallScore < 60).length;
    const rejects = batchResults.filter(r => r.overallScore < 40).length;
    return { goodFits, moderate, rejects, total: batchResults.length };
  };

  const stats = getCandidateStats();

  // Filter candidates
  const getFilteredCandidates = () => {
    if (!batchResults) return [];
    if (filter === 'good') return batchResults.filter(r => r.overallScore >= 60);
    if (filter === 'reject') return batchResults.filter(r => r.overallScore < 40);
    return batchResults;
  };

  const filteredCandidates = getFilteredCandidates();

  // Get candidate category
  const getCandidateCategory = (score) => {
    if (score >= 80) return { label: 'Strong Match', color: 'green', icon: CheckCircle2 };
    if (score >= 60) return { label: 'Good Fit', color: 'blue', icon: ThumbsUp };
    if (score >= 40) return { label: 'Moderate', color: 'yellow', icon: Eye };
    return { label: 'Poor Fit', color: 'red', icon: XCircle };
  };

  if (batchResults && !showingDetail) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </button>
        </div>

        {/* Summary Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Strong Matches</p>
                  <p className="text-3xl font-bold text-green-800">{stats.goodFits}</p>
                  <p className="text-xs text-green-600 mt-1">≥60% match</p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-600 opacity-50" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Moderate</p>
                  <p className="text-3xl font-bold text-yellow-800">{stats.moderate}</p>
                  <p className="text-xs text-yellow-600 mt-1">40-59% match</p>
                </div>
                <Eye className="h-12 w-12 text-yellow-600 opacity-50" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Poor Fits</p>
                  <p className="text-3xl font-bold text-red-800">{stats.rejects}</p>
                  <p className="text-xs text-red-600 mt-1">&lt;40% match</p>
                </div>
                <XCircle className="h-12 w-12 text-red-600 opacity-50" />
              </div>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <p className="text-3xl font-bold text-blue-800">{stats.total}</p>
                  <p className="text-xs text-blue-600 mt-1">Candidates</p>
                </div>
                <Users className="h-12 w-12 text-blue-600 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Title and Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Candidate Review</h1>
              <p className="text-gray-600">Click a candidate to see full analysis</p>
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats?.total || 0})
            </button>
            <button
              onClick={() => setFilter('good')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                filter === 'good'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Good Fits ({stats?.goodFits || 0})</span>
            </button>
            <button
              onClick={() => setFilter('reject')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                filter === 'reject'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>Rejects ({stats?.rejects || 0})</span>
            </button>
          </div>
        </div>

        {/* Candidate List */}
        <div className="grid gap-4">
          {filteredCandidates.map((item) => {
            const score = item.overallScore || 0;
            const category = getCandidateCategory(score);
            const CategoryIcon = category.icon;
            const isShortlisted = shortlisted.has(item.cvIndex);
            const isRejected = rejected.has(item.cvIndex);
            
            const getCardBorderColor = () => {
              if (isShortlisted) return 'border-green-500 border-4';
              if (isRejected) return 'border-red-500 border-4';
              if (score >= 80) return 'border-green-300 border-2';
              if (score >= 60) return 'border-blue-300 border-2';
              if (score >= 40) return 'border-yellow-300 border-2';
              return 'border-red-300 border-2';
            };

            const getCardBgColor = () => {
              if (isShortlisted) return 'bg-green-50';
              if (isRejected) return 'bg-red-50';
              if (score >= 80) return 'bg-green-50';
              if (score >= 60) return 'bg-blue-50';
              if (score >= 40) return 'bg-yellow-50';
              return 'bg-red-50';
            };

            return (
              <div
                key={item.cvIndex}
                className={`card ${getCardBgColor()} ${getCardBorderColor()} transition-all duration-200`}
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = batchResults.findIndex(r => r.cvIndex === item.cvIndex);
                      handleSelectCandidate(idx);
                    }}
                    className="flex items-start space-x-4 flex-1 text-left hover:opacity-80 transition-opacity"
                  >
                    {/* Rank and Category Badge */}
                    <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                      <div className={`w-14 h-14 rounded-full ${
                        score >= 80 ? 'bg-green-500' :
                        score >= 60 ? 'bg-blue-500' :
                        score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      } text-white flex items-center justify-center font-bold text-lg shadow-lg`}>
                        #{item.rank}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                        category.color === 'green' ? 'bg-green-200 text-green-800' :
                        category.color === 'blue' ? 'bg-blue-200 text-blue-800' :
                        category.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        <CategoryIcon className="h-3 w-3" />
                        <span>{category.label}</span>
                      </div>
                    </div>
                    
                    {/* Candidate Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {item.candidateName || `Resume ${item.cvIndex + 1}`}
                        </h3>
                        {isShortlisted && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>SHORTLISTED</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                            <XCircle className="h-3 w-3" />
                            <span>REJECTED</span>
                          </span>
                        )}
                      </div>
                      
                      {item.candidateEmail && (
                        <div className="flex items-center space-x-2 text-gray-600 mb-3">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate">{item.candidateEmail}</span>
                        </div>
                      )}
                      
                      {/* Match Score */}
                      <div className="flex items-center space-x-3">
                        <div className={`px-4 py-2 rounded-lg font-bold text-lg ${
                          score >= 80 ? 'bg-green-100 text-green-700' :
                          score >= 60 ? 'bg-blue-100 text-blue-700' :
                          score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {score}% Match
                        </div>
                        <TrendingUp className={`h-5 w-5 ${
                          score >= 60 ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                    </div>
                    
                    {/* View Details Arrow */}
                    <div className="flex-shrink-0 ml-4">
                      <ChevronRight className="h-6 w-6 text-gray-400" />
                    </div>
                  </button>

                  {/* Quick Actions */}
                  <div className="flex-shrink-0 ml-4 flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={(e) => handleShortlist(item.cvIndex, e)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2 ${
                        isShortlisted
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleReject(item.cvIndex, e)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2 ${
                        isRejected
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>{isRejected ? 'Rejected' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCandidates.length === 0 && (
          <div className="card text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No candidates match the current filter.</p>
          </div>
        )}
      </div>
    );
  }

  if (showingDetail) {
    const score = selectedResult.overallScore || 0;
    const category = getCandidateCategory(score);
    const CategoryIcon = category.icon;
    const isShortlisted = shortlisted.has(selectedResult.cvIndex);
    const isRejected = rejected.has(selectedResult.cvIndex);
    
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to list</span>
          </button>
        </div>
        
        {/* Candidate Header Card */}
        <div className={`mb-6 card bg-gradient-to-r ${
          isShortlisted ? 'from-green-50 to-green-100 border-green-500 border-4' :
          isRejected ? 'from-red-50 to-red-100 border-red-500 border-4' :
          score >= 80 ? 'from-green-50 to-blue-50 border-green-300 border-2' :
          score >= 60 ? 'from-blue-50 to-blue-100 border-blue-300 border-2' :
          score >= 40 ? 'from-yellow-50 to-yellow-100 border-yellow-300 border-2' :
          'from-red-50 to-red-100 border-red-300 border-2'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className={`w-20 h-20 rounded-full ${
                score >= 80 ? 'bg-green-500' :
                score >= 60 ? 'bg-blue-500' :
                score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              } text-white flex items-center justify-center font-bold text-2xl shadow-lg`}>
                #{selectedResult.rank}
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <User className="h-6 w-6 text-gray-600" />
                  <h2 className="text-3xl font-bold text-gray-900">
                    {selectedResult.candidateName || `Resume ${selectedResult.cvIndex + 1}`}
                  </h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-2 ${
                    category.color === 'green' ? 'bg-green-200 text-green-800' :
                    category.color === 'blue' ? 'bg-blue-200 text-blue-800' :
                    category.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    <CategoryIcon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </div>
                  {isShortlisted && (
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>SHORTLISTED</span>
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center space-x-1">
                      <XCircle className="h-3 w-3" />
                      <span>REJECTED</span>
                    </span>
                  )}
                </div>
                {selectedResult.candidateEmail && (
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{selectedResult.candidateEmail}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-600">Rank #{selectedResult.rank} of {batchResults?.length || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 font-medium mb-1">Match Score</div>
                <div className={`text-4xl font-bold ${
                  score >= 80 ? 'text-green-600' :
                  score >= 60 ? 'text-blue-600' :
                  score >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {score}%
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={(e) => handleShortlist(selectedResult.cvIndex, e)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2 ${
                    isShortlisted
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleReject(selectedResult.cvIndex, e)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2 ${
                    isRejected
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>{isRejected ? 'Rejected' : 'Reject'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <AnalysisResults data={selectedResult.analysis} />
      </div>
    );
  }


  if (batchMutation.error) {
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
          error={batchMutation.error} 
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (batchMutation.isLoading) {
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
