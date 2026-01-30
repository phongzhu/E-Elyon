import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { useBranding } from "../../context/BrandingContext";
import { 
  Database, 
  Download, 
  Upload, 
  AlertCircle,
  CheckCircle,
  Loader
} from "lucide-react";

export default function DatabaseSettings() {
  const { branding } = useBranding();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");

  const primaryColor = branding?.primary_color || "#0B6516";
  const secondaryColor = branding?.secondary_color || "#9C0808";

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupSuccess(false);
    setError("");

    try {
      // Simulate backup process (placeholder)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a sample JSON backup file
      const backupData = {
        timestamp: new Date().toISOString(),
        database: "e-elyon",
        version: "1.0.0",
        tables: {
          users: 4,
          audit_logs: 25,
          settings: 1
        },
        message: "This is a placeholder backup file"
      };

      // Convert to JSON and create a blob
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `e-elyon-backup-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 5000);
    } catch (err) {
      setError("Failed to create backup. Please try again.");
      console.error("Backup error:", err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === "application/json" || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setError("");
      } else {
        setError("Please select a valid JSON backup file.");
        setSelectedFile(null);
      }
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError("Please select a backup file first.");
      return;
    }

    setRestoreLoading(true);
    setRestoreSuccess(false);
    setError("");

    try {
      // Read and validate the file
      const fileContent = await selectedFile.text();
      const backupData = JSON.parse(fileContent);

      // Simulate restore process (placeholder)
      await new Promise(resolve => setTimeout(resolve, 2500));

      console.log("Restoring backup:", backupData);

      setRestoreSuccess(true);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById("restore-file-input");
      if (fileInput) fileInput.value = "";

      setTimeout(() => setRestoreSuccess(false), 5000);
    } catch (err) {
      setError("Failed to restore backup. Please check the file format.");
      console.error("Restore error:", err);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-[Inter]">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main className="p-8 overflow-y-auto">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-6">
            <Database size={28} style={{ color: secondaryColor }} />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Database Settings</h1>
              <p className="text-gray-500 text-sm mt-1">Manage database backup and restore operations</p>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {backupSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-800">Backup Successful</h4>
                <p className="text-sm text-green-700">Database backup has been downloaded successfully.</p>
              </div>
            </div>
          )}

          {restoreSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-800">Restore Successful</h4>
                <p className="text-sm text-green-700">Database has been restored successfully.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Backup Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Download size={24} style={{ color: primaryColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Database Backup</h2>
                  <p className="text-sm text-gray-500">Export a complete copy of your database</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">What's included:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• All user accounts and profiles</li>
                    <li>• Audit logs and activity history</li>
                    <li>• System settings and configurations</li>
                    <li>• Branding customizations</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <strong>Note:</strong> Backup files are downloaded as JSON files. Store them securely.
                </div>

                <button
                  onClick={handleBackup}
                  disabled={backupLoading}
                  className="w-full py-3 px-4 rounded-lg font-medium text-white shadow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {backupLoading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Creating Backup...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      Download Backup
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Database Restore Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${secondaryColor}20` }}
                >
                  <Upload size={24} style={{ color: secondaryColor }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Database Restore</h2>
                  <p className="text-sm text-gray-500">Restore database from a backup file</p>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-yellow-700 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Restoring a backup will replace all current data. This action cannot be undone.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Backup File
                  </label>
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    disabled={restoreLoading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: <span className="font-medium">{selectedFile.name}</span>
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Before restoring:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Ensure the backup file is valid</li>
                    <li>• Create a current backup if needed</li>
                    <li>• Notify all system users</li>
                    <li>• Schedule during low-activity periods</li>
                  </ul>
                </div>

                <button
                  onClick={handleRestore}
                  disabled={!selectedFile || restoreLoading}
                  className="w-full py-3 px-4 rounded-lg font-medium text-white shadow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  style={{ backgroundColor: secondaryColor }}
                >
                  {restoreLoading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Restoring Database...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Restore Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Backups Section */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Backups</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">2023-11-20</td>
                    <td className="px-4 py-3 text-gray-700">10:30 AM</td>
                    <td className="px-4 py-3 text-gray-700">2.4 MB</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Success
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">2023-11-19</td>
                    <td className="px-4 py-3 text-gray-700">09:15 AM</td>
                    <td className="px-4 py-3 text-gray-700">2.3 MB</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Success
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">2023-11-18</td>
                    <td className="px-4 py-3 text-gray-700">08:45 AM</td>
                    <td className="px-4 py-3 text-gray-700">2.2 MB</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Success
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
