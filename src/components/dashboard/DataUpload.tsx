
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DataUploadProps {
  onDataUpdate: (data: any[]) => void;
}

const DataUpload = ({ onDataUpdate }: DataUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      // Simulating file processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock data - in real implementation, you would parse the Excel/CSV file
      const mockData = [
        { hatchery: "NEW", name: "Sample Farm 1", flock: 7001, age: 45, fertility: 85.5, ifDev: -2.1, hatch: 79.2, hoi: 93.8, hof: 91.4, earlyDead: 2.8 },
        { hatchery: "NEW", name: "Sample Farm 2", flock: 7002, age: 38, fertility: 91.2, ifDev: -1.8, hatch: 84.6, hoi: 95.1, hof: 92.8, earlyDead: 2.3 },
      ];

      onDataUpdate(mockData);
      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: `Successfully processed ${file.name} with ${mockData.length} records.`,
      });
    } catch (error) {
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const sampleData = [
    ['Hatchery', 'Name', 'Flock', 'Age', 'Fertility', 'I/F dev.', 'Hatch', 'HOI', 'HOF', 'Early Dead'],
    ['DHN', 'Sample Farm', '6400', '45', '85.2', '-2.1', '78.5', '92.3', '89.8', '2.9'],
    ['SAM', 'Another Farm', '6401', '42', '88.1', '-1.8', '81.2', '94.1', '91.5', '2.4']
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel or CSV Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? 'Processing...' : 'Drop your file here'}
            </h3>
            <p className="text-gray-600 mb-4">
              or click to browse for Excel (.xlsx, .xls) or CSV files
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="max-w-xs mx-auto"
              disabled={uploading}
            />
            {uploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Status */}
      {uploadStatus !== 'idle' && (
        <Alert className={uploadStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {uploadStatus === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={uploadStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
            {uploadStatus === 'success'
              ? 'File uploaded and processed successfully!'
              : 'Upload failed. Please check your file format and try again.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Data Format Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Data Format Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Required Columns:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Hatchery - Hatchery identifier (e.g., DHN, SAM, ENT)</li>
                <li>Name - Farm/Location name</li>
                <li>Flock - Flock number</li>
                <li>Age - Age in weeks</li>
                <li>Fertility - Fertility percentage</li>
                <li>I/F dev. - Fertility deviation</li>
                <li>Hatch - Hatch rate percentage</li>
                <li>HOI - Hatch of incubated percentage</li>
                <li>HOF - Hatch of fertile percentage</li>
                <li>Early Dead - Early mortality percentage</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Sample Data Format:</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-sm">
                  <thead>
                    {sampleData.slice(0, 1).map((row, rowIndex) => (
                      <tr key={rowIndex} className="bg-gray-50">
                        {row.map((cell, cellIndex) => (
                          <th key={cellIndex} className="border border-gray-200 p-2 text-left font-medium">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {sampleData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-200 p-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Tips:</h4>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Ensure your file has column headers in the first row</li>
                <li>Use consistent naming conventions for hatcheries</li>
                <li>Numeric values should not contain special characters except decimal points</li>
                <li>Save Excel files in .xlsx format for best compatibility</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataUpload;
