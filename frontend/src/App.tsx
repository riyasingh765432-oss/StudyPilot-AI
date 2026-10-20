import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { Dashboard } from './pages/Dashboard';
import { NotesStudio } from './pages/NotesStudio';
import { StudyPlanner } from './pages/StudyPlanner';
import { QuizLab } from './pages/QuizLab';
import { Flashcards } from './pages/Flashcards';
import { AskNotes } from './pages/AskNotes';
import { Progress } from './pages/Progress';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public Authentication Pages */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />

              {/* Protected Workspace Pages */}
              <Route element={<ProtectedRoute />}>
                <Route index element={<Dashboard />} />
                <Route path="notes" element={<NotesStudio />} />
                <Route path="planner" element={<StudyPlanner />} />
                <Route path="quiz" element={<QuizLab />} />
                <Route path="flashcards" element={<Flashcards />} />
                <Route path="ask" element={<AskNotes />} />
                <Route path="progress" element={<Progress />} />
              </Route>

              {/* Fallback 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
