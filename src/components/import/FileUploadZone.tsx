import { Upload } from 'lucide-react';
import { useCallback } from 'react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploadZone({ onFileSelect, disabled }: FileUploadZoneProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'
      }`}
    >
      <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">
        Drag & Drop Excel File
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        or click to browse
      </p>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInput}
        disabled={disabled}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer"
      >
        Select File
      </label>
      <p className="text-xs text-muted-foreground mt-4">
        Supports: .xlsx, .xls files
      </p>
    </div>
  );
}
