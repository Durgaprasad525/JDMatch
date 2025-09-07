export function LoadingSpinner() {
  return (
    <div className="card text-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Documents</h3>
          <p className="text-gray-600">
            Our AI is analyzing the job description and CV to provide you with detailed insights...
          </p>
        </div>
      </div>
    </div>
  );
}
