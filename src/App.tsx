/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TutorView } from './components/TutorView';
import { QuizView } from './components/QuizView';
import { SolverView } from './components/SolverView';
import { HistoryView } from './components/HistoryView';
import { AuthModal } from './components/AuthModal';
import { SubjectCategory, UserProfile } from './types';
import { GraduationCap } from 'lucide-react';
import { speechService } from './utils/speech';
import { saveAccountToHistory, syncExistingAccountsOnBoot } from './utils/accountHistory';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tutor' | 'quiz' | 'solver' | 'history'>('tutor');
  
  // Current logged in user state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ai_student_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [quizTopic, setQuizTopic] = useState<string>('');
  const [quizSubject, setQuizSubject] = useState<SubjectCategory>('General');
  const [solverProblem, setSolverProblem] = useState<string>('');

  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [quizCount, setQuizCount] = useState<number>(0);

  // Load quiz count
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('ai_student_quiz_history');
      if (historyStr) {
        const hist = JSON.parse(historyStr);
        if (Array.isArray(hist)) {
          setQuizCount(hist.length);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync existing logged in user to account history on mount
  useEffect(() => {
    syncExistingAccountsOnBoot(currentUser);
  }, []);

  // Listen to speech synthesis state
  useEffect(() => {
    speechService.setListener((speaking) => {
      setIsAudioPlaying(speaking);
    });
  }, []);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ai_student_current_user', JSON.stringify(user));
      // Automatically record any email used in account history
      saveAccountToHistory(user.email, user.displayName, user.avatarColor);
    } catch (e) {
      console.warn('Failed to save user session', e);
    }
  };

  const handleSwitchAccount = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const storedCreds = localStorage.getItem('ai_student_user_credentials');
      const creds = storedCreds ? JSON.parse(storedCreds) : {};
      const userCred = creds[cleanEmail];

      const namePrefix = cleanEmail.split('@')[0];
      const derivedName = userCred?.displayName || namePrefix
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      const userProfile: UserProfile = {
        id: `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        displayName: derivedName,
        avatarColor: 'from-indigo-600 to-purple-600',
        createdAt: userCred?.createdAt || Date.now(),
        lastLogin: Date.now(),
      };

      handleLogin(userProfile);
    } catch {
      setIsAuthModalOpen(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ai_student_current_user');
    } catch (e) {
      console.warn('Failed to remove user session', e);
    }
  };

  const handleStopAudio = () => {
    speechService.stop();
    setIsAudioPlaying(false);
  };

  const handleLaunchQuizFromTopic = (topic: string, subject: SubjectCategory = 'General') => {
    setQuizTopic(topic);
    setQuizSubject(subject);
    setActiveTab('quiz');
  };

  const handleAskTutor = (promptContext: string) => {
    setActiveTab('tutor');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai_student_ask_tutor', { detail: { prompt: promptContext } }));
    }, 100);
  };

  const handleViewSolverProblem = (problem: string) => {
    setSolverProblem(problem);
    setActiveTab('solver');
  };

  const handleQuizCompleted = () => {
    setQuizCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAudioPlaying={isAudioPlaying}
        onStopAudio={handleStopAudio}
        quizCount={quizCount}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {activeTab === 'tutor' && (
          <TutorView
            currentUser={currentUser}
            onLaunchQuizFromTopic={handleLaunchQuizFromTopic}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            initialTopic={quizTopic}
            initialSubject={quizSubject}
            onAskTutor={handleAskTutor}
            onQuizCompleted={handleQuizCompleted}
          />
        )}

        {activeTab === 'solver' && (
          <SolverView 
            initialProblem={solverProblem}
            onAskTutor={handleAskTutor} 
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            currentUser={currentUser}
            onRetakeQuiz={handleLaunchQuizFromTopic}
            onAskTutor={handleAskTutor}
            onViewSolverProblem={handleViewSolverProblem}
            onSwitchAccount={handleSwitchAccount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        currentUser={currentUser}
      />

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">AI Student Assistance</span>
            <span>— Personalized learning, practice testing & homework comprehension</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Powered by Gemini 3.8</span>
            <span>•</span>
            {currentUser ? (
              <span className="text-indigo-400">Signed in: {currentUser.email}</span>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Sign In with Email
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
