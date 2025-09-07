import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  test('renders upload area when no file is selected', () => {
    render(
      <FileUpload
        file={null}
        onFileSelect={mockOnFileSelect}
        accept=".pdf"
        label="Upload PDF"
      />
    );

    expect(screen.getByText('Upload PDF')).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop a PDF file here/)).toBeInTheDocument();
  });

  test('renders file info when file is selected', () => {
    const mockFile = 'data:application/pdf;base64,testdata';
    
    render(
      <FileUpload
        file={mockFile}
        onFileSelect={mockOnFileSelect}
        accept=".pdf"
        label="Upload PDF"
      />
    );

    expect(screen.getByText('PDF uploaded successfully')).toBeInTheDocument();
    expect(screen.getByText('Ready for analysis')).toBeInTheDocument();
  });

  test('calls onFileSelect when file is removed', () => {
    const mockFile = 'data:application/pdf;base64,testdata';
    
    render(
      <FileUpload
        file={mockFile}
        onFileSelect={mockOnFileSelect}
        accept=".pdf"
        label="Upload PDF"
      />
    );

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);

    expect(mockOnFileSelect).toHaveBeenCalledWith(null);
  });
});
