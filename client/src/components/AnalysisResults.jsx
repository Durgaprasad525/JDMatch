import { TrendingUp, TrendingDown, CheckCircle, XCircle, Star, Target, Lightbulb } from 'lucide-react';

export function AnalysisResults({ data }) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No analysis data available</p>
      </div>
    );
  }

  const {
    overallScore = 0,
    strengths = [],
    weaknesses = [],
    alignment = {},
    recommendations = [],
    summary = '',
    keyMatches = [],
    missingRequirements = []
  } = data;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-8">
      {/* Overall Score */}
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Overall Match Score</h2>
        <div className="flex justify-center mb-4">
          <div className={`w-32 h-32 rounded-full ${getScoreBgColor(overallScore)} flex items-center justify-center`}>
            <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
          </div>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">{summary}</p>
      </div>

      {/* Alignment Scores */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <Star className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">Technical Skills</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(alignment.technicalSkills || 0)}`}>
            {alignment.technicalSkills || 0}%
          </div>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold">Experience</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(alignment.experience || 0)}`}>
            {alignment.experience || 0}%
          </div>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold">Education</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(alignment.education || 0)}`}>
            {alignment.education || 0}%
          </div>
        </div>

        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold">Soft Skills</h3>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(alignment.softSkills || 0)}`}>
            {alignment.softSkills || 0}%
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Strengths */}
        <div className="card">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Strengths</h3>
          </div>
          <ul className="space-y-3">
            {strengths.map((strength, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="card">
          <div className="flex items-center mb-4">
            <XCircle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Areas for Improvement</h3>
          </div>
          <ul className="space-y-3">
            {weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Key Matches */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Target className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Key Matches</h3>
          </div>
          <ul className="space-y-3">
            {keyMatches.map((match, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{match}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missing Requirements */}
        <div className="card">
          <div className="flex items-center mb-4">
            <TrendingDown className="h-6 w-6 text-orange-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Missing Requirements</h3>
          </div>
          <ul className="space-y-3">
            {missingRequirements.map((requirement, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{requirement}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Lightbulb className="h-6 w-6 text-yellow-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-900">Recommendations</h3>
        </div>
        <ul className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
