import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Sparkles,
  Trash2,
  FileCode,
  AlertCircle,
  Eye,
  CheckCircle,
  X,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import {
  type DocumentItem,
  type DocumentDetail,
  type AIStatus,
  apiGetDocuments,
  apiUploadDocument,
  apiDeleteDocument,
  apiSummarizeDocument,
  apiGetDocumentDetail,
  apiGetAIStatus,
} from '../services/api';

export const NotesStudio: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active view modal / drawer state
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  // Summary generation state
  const [summarizingId, setSummarizingId] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [failedDocId, setFailedDocId] = useState<number | null>(null);
  const summarizeAbortControllerRef = useRef<AbortController | null>(null);

  const loadData = async () => {
    try {
      const [docs, status] = await Promise.all([
        apiGetDocuments(),
        apiGetAIStatus().catch(() => null),
      ]);
      setDocuments(docs);
      if (status) setAiStatus(status);
    } catch (err: any) {
      console.error('Failed to load notes data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      // Abort any pending summary request if component unmounts
      if (summarizeAbortControllerRef.current) {
        summarizeAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const uploadedDoc = await apiUploadDocument(file);
      setDocuments((prev) => [uploadedDoc, ...prev]);
      setUploadSuccess(`Successfully uploaded and parsed "${file.name}"!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await apiDeleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  const handleSummarize = async (id: number) => {
    // Prevent duplicate summary requests while one is already in progress
    if (summarizingId !== null) {
      return;
    }

    setSummaryError(null);
    setFailedDocId(null);
    setSummarizingId(id);

    const controller = new AbortController();
    summarizeAbortControllerRef.current = controller;

    try {
      const result = await apiSummarizeDocument(id, controller.signal);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, summary: result.summary } : d))
      );
      if (selectedDoc?.id === id) {
        setSelectedDoc((prev) => (prev ? { ...prev, summary: result.summary } : null));
      }
      setFailedDocId(null);
    } catch (err: any) {
      // If request was aborted due to unmount, avoid error flashing
      if (controller.signal.aborted) {
        return;
      }
      setSummaryError(err.message || 'Failed to generate study summary.');
      setFailedDocId(id);
    } finally {
      setSummarizingId(null);
      summarizeAbortControllerRef.current = null;
    }
  };

  const handleViewDetail = async (id: number) => {
    setViewingId(id);
    try {
      const detail = await apiGetDocumentDetail(id);
      setSelectedDoc(detail);
    } catch (err: any) {
      alert(err.message || 'Failed to load document content.');
    } finally {
      setViewingId(null);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Notes Studio
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
              Stage 3 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload study documents (PDF, Word, Markdown, Text) for text extraction, AI summarization, and grounded inquiry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Status Badge */}
          {aiStatus && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                aiStatus.configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
              }`}
              title={
                aiStatus.configured
                  ? `Google Gemini active (${aiStatus.model})`
                  : 'Add GEMINI_API_KEY to backend/.env'
              }
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{aiStatus.configured ? `Gemini: ${aiStatus.model}` : 'Gemini Key Needed'}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            {isUploading ? 'Extracting Text...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      {/* Gemini Configuration Alert if Key Missing */}
      {aiStatus && !aiStatus.configured && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Gemini API Key Required for AI Features:</span> Document upload, text parsing, and storage are fully functional. To enable Gemini study summaries and Q&A, add <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">GEMINI_API_KEY="your_api_key"</code> to your <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">backend/.env</code> file.
          </div>
        </div>
      )}

      {/* Alerts */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <ErrorAlert
          title="Upload Failed"
          message={uploadError}
          onDismiss={() => setUploadError(null)}
        />
      )}

      {summaryError && (
        <ErrorAlert
          title="Summary Generation Failed"
          message={summaryError}
          onRetry={failedDocId ? () => handleSummarize(failedDocId) : undefined}
          onDismiss={() => {
            setSummaryError(null);
            setFailedDocId(null);
          }}
        />
      )}

      {/* Main Content: Document List or Empty State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Uploaded Study Materials</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length === 1 ? '' : 's'} parsed and available for review
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner label="Loading study library..." />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {doc.original_filename}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatFileSize(doc.file_size)} &middot; Uploaded on{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.summary && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>AI Summary Ready</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(doc.id)}
                      isLoading={viewingId === doc.id}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View Text
                    </Button>

                    <Button
                      variant={doc.summary ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleSummarize(doc.id)}
                      isLoading={summarizingId === doc.id}
                      disabled={summarizingId !== null}
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                      title={
                        summarizingId !== null
                          ? 'Summary generation in progress...'
                          : doc.summary
                          ? 'Regenerate study summary'
                          : 'Generate AI study summary'
                      }
                    >
                      {summarizingId === doc.id
                        ? 'Generating...'
                        : doc.summary
                        ? 'View / Update Summary'
                        : 'Generate Summary'}
                    </Button>

                    <button
                      onClick={() => handleDelete(doc.id, doc.original_filename)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete document"
                      aria-label="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="No study materials uploaded yet"
              description="Upload PDF slides, Word documents, Markdown files, or lecture notes. StudyPilot AI will extract text, produce structured summaries, and ground conversational Q&A in your course materials."
              stageTag="Stage 3: Ready for Upload"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Upload Your First Document
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Document Detail / Summary Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                  {selectedDoc.original_filename}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Size: {formatFileSize(selectedDoc.file_size)} &middot; Uploaded{' '}
                  {new Date(selectedDoc.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Summary Section */}
              {selectedDoc.summary ? (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Study Summary (Google Gemini)</span>
                  </div>
                  <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedDoc.summary}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No summary generated yet for this document.
                  </p>
                  <div className="mt-2.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSummarize(selectedDoc.id)}
                      isLoading={summarizingId === selectedDoc.id}
                      disabled={summarizingId !== null}
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      {summarizingId === selectedDoc.id ? 'Generating Summary...' : 'Generate Summary Now'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Extracted Text Section */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Extracted Document Text</span>
                </h4>
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {selectedDoc.extracted_text || 'No readable text content extracted.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Upload className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Multi-Format Ingestion</CardTitle>
            <CardDescription>PDF, DOCX, Markdown, and plain text</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Uploaded materials are parsed using Python text extractors (pypdf, python-docx) and persisted in SQLite.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">AI Summaries & Recall</CardTitle>
            <CardDescription>Synthesized key takeaways and definitions</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Google Gemini API integration synthesizes chapter overviews, core concepts, and active recall test prompts.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Grounded Q&A</CardTitle>
            <CardDescription>Ask questions in Ask Your Notes</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Extracted text serves as authoritative context for grounded, zero-hallucination answers with document citations.
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
