import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  MessageSquareQuote,
  Send,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import {
  type DocumentItem,
  type AIStatus,
  type AskResponse,
  apiGetDocuments,
  apiAskNotes,
  apiGetAIStatus,
} from '../services/api';

interface QnAMessage {
  id: string;
  question: string;
  answer: string;
  sources: string[];
  model: string;
  timestamp: string;
}

export const AskNotes: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  // Form & Query State
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<{ question: string; docId: string } | null>(null);
  const askAbortControllerRef = useRef<AbortController | null>(null);

  // Thread history
  const [messages, setMessages] = useState<QnAMessage[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [docs, status] = await Promise.all([
          apiGetDocuments(),
          apiGetAIStatus().catch(() => null),
        ]);
        setDocuments(docs);
        if (status) setAiStatus(status);
      } catch (err) {
        console.error('Failed to initialize Ask Your Notes:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    init();

    return () => {
      // Abort any pending inquiry if component unmounts
      if (askAbortControllerRef.current) {
        askAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (
    e?: React.FormEvent,
    retryTarget?: { question: string; docId: string }
  ) => {
    if (e) e.preventDefault();

    // Prevent duplicate concurrent requests
    if (isAsking) return;

    const q = retryTarget ? retryTarget.question : question;
    const docId = retryTarget ? retryTarget.docId : selectedDocId;

    if (!q.trim()) return;

    setQueryError(null);
    setLastFailedQuery(null);
    setIsAsking(true);

    const docIdNum = docId === 'all' ? undefined : Number(docId);
    const controller = new AbortController();
    askAbortControllerRef.current = controller;

    try {
      const response: AskResponse = await apiAskNotes(q.trim(), docIdNum, controller.signal);
      const newMsg: QnAMessage = {
        id: Date.now().toString(),
        question: response.question,
        answer: response.answer,
        sources: response.sources,
        model: response.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [newMsg, ...prev]);
      if (!retryTarget) {
        setQuestion('');
      }
      setLastFailedQuery(null);
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      setQueryError(err.message || 'Failed to retrieve answer from Gemini.');
      setLastFailedQuery({ question: q, docId });
    } finally {
      setIsAsking(false);
      askAbortControllerRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Ask Your Notes
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
              Stage 3 Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inquire about formulas, concepts, and definitions grounded strictly in your uploaded materials.
          </p>
        </div>

        {/* AI Status Badge */}
        {aiStatus && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              aiStatus.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{aiStatus.configured ? `Model: ${aiStatus.model}` : 'Gemini Key Needed'}</span>
          </div>
        )}
      </div>

      {/* Notice if Gemini is not configured */}
      {aiStatus && !aiStatus.configured && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Gemini API Key Required:</span> To ask questions and receive grounded AI responses, add your API key as <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">GEMINI_API_KEY="your_api_key"</code> in <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">backend/.env</code>.
          </div>
        </div>
      )}

      {/* Main Container */}
      {isLoadingDocs ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner label="Loading notes knowledge base..." />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={<Sparkles className="w-8 h-8" />}
              title="Knowledge base is currently empty"
              description="To start asking questions and receiving grounded answers with citations, upload course notes, syllabi, or textbook chapters in Notes Studio."
              stageTag="Notes Required"
              action={
                <Link to="/notes">
                  <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Go to Notes Studio & Upload
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Question Input Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Pose an Inquiry</CardTitle>
                  <CardDescription>
                    Gemini will analyze your notes and synthesize a grounded explanation
                  </CardDescription>
                </div>

                {/* Scope selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Knowledge Source:
                  </span>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Documents ({documents.length})</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id.toString()}>
                        {d.original_filename}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. Explain how mitochondria generate ATP based on the lecture notes."
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
                  />
                </div>

                {queryError && (
                  <ErrorAlert
                    title="Inquiry Failed"
                    message={queryError}
                    onRetry={
                      lastFailedQuery
                        ? () => handleSubmit(undefined, lastFailedQuery)
                        : undefined
                    }
                    onDismiss={() => {
                      setQueryError(null);
                      setLastFailedQuery(null);
                    }}
                  />
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Grounded strictly in your uploaded course materials.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isAsking}
                    disabled={isAsking || !question.trim()}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    {isAsking ? 'Consulting Gemini...' : 'Ask Notes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Q&A Thread History */}
          {messages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Inquiry Responses ({messages.length})</span>
              </h3>

              <div className="space-y-4">
                {messages.map((msg) => (
                  <Card key={msg.id} className="overflow-hidden">
                    {/* Question Header */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          Q
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {msg.question}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Answer Content */}
                    <CardContent className="p-5">
                      <div className="prose prose-xs dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {msg.answer}
                      </div>

                      {/* Source attribution footer */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Referenced Notes:</span>
                          </span>
                          {msg.sources.map((src, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
