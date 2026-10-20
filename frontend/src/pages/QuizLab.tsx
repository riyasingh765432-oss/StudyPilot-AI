import React from 'react';
import { HelpCircle, Sparkles, Brain, Award, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const QuizLab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Quiz Lab
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Active recall quizzes automatically generated from your study documents.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4" />}
            disabled
            title="Quiz generation will be enabled in upcoming stages"
          >
            Generate Quiz (Stage 2)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={<HelpCircle className="w-8 h-8" />}
            title="No quizzes generated or completed yet"
            description="Active recall is one of the most effective study methods. Once you upload notes in Notes Studio, Quiz Lab will generate multiple choice, fill-in-the-blank, and conceptual synthesis questions."
            stageTag="Stage 1: Foundation Ready"
            action={
              <div className="text-[11px] text-slate-400 text-center">
                Gemini API prompt templates and quiz evaluation logic will be wired in future stages.
              </div>
            }
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Brain className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Adaptive Questioning</CardTitle>
            <CardDescription>Calibrated to your difficulty curve</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Questions adjust dynamically based on your accuracy, focusing more attention on missed concepts.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <Award className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Instant Rationales</CardTitle>
            <CardDescription>Understand the reasoning behind answers</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Every question includes a complete AI explanation referencing the original paragraph in your study notes.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <BarChart2 className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Mastery Tracking</CardTitle>
            <CardDescription>Identify blind spots before exam day</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Detailed performance breakdown highlighting high-confidence and low-confidence topics.
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
