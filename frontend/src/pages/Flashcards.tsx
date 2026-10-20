import React from 'react';
import { Layers, Plus, Repeat, Zap, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const Flashcards: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Flashcards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Spaced repetition flashcards with SM-2 memory retention algorithms.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            disabled
            title="Deck creation will be enabled in future stages"
          >
            Create Deck (Stage 2)
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={<Layers className="w-8 h-8" />}
            title="No flashcard decks created yet"
            description="You don't have any flashcard decks. You will soon be able to auto-extract flashcards from lecture notes or author custom flashcard sets."
            stageTag="Stage 1: Foundation Ready"
            action={
              <div className="text-[11px] text-slate-400 text-center">
                Spaced-repetition scheduling algorithm will be backed by SQLite persistence.
              </div>
            }
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Repeat className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">SM-2 Spaced Repetition</CardTitle>
            <CardDescription>Scientifically scheduled review intervals</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Cards you find difficult appear frequently; familiar cards are spaced days and weeks apart.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Auto-Generated Cards</CardTitle>
            <CardDescription>Extract terms & formulas from notes</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            AI automatically extracts definitions, formulas, and historical dates directly from your notes.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Confidence Rating</CardTitle>
            <CardDescription>Rate retention from 1 to 5</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Self-grade each answer to adjust ease factors and optimize long-term memory consolidation.
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
