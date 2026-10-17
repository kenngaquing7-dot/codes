import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  HelpCircle, 
  BookOpen, 
  Calculator, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Download, 
  RotateCcw, 
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  Mail,
  UserCheck,
  LogIn
} from 'lucide-react';
import { QuizAttempt, ProblemHistoryItem, TutorHistorySession, SubjectCategory, AccountHistoryItem, UserProfile } from '../types';
import { getAccountHistory, removeAccountFromHistory } from '../utils/accountHistory';

interface HistoryViewProps {
  currentUser?: UserProfile | null;
  onRetakeQuiz: (topic: string, subject?: SubjectCategory) => void;
  onAskTutor: (prompt: string) => void;
  onViewSolverProblem: (problem: string) => void;
  onSwitchAccount?: (email: string) => void;
  onOpenAuthModal?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  currentUser,
  onRetakeQuiz,
  onAskTutor,
  onViewSolverProblem,
  onSwitchAccount,
  onOpenAuthModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'accounts' | 'quiz' | 'tutor' | 'solver'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [expandedSolverId, setExpandedSolverId] = useState<string | null>(null);

  // Load saved email accounts from history
  const [accounts, setAccounts] = useState<AccountHistoryItem[]>(() => {
    return getAccountHistory();
  });

  // Keep accounts synchronized on global account changes
  useEffect(() => {
    const handleAccountsUpdated = () => {
      setAccounts(getAccountHistory());
    };
    window.addEventListener('ai_student_accounts_updated', handleAccountsUpdated);
    window.addEventListener('storage', handleAccountsUpdated);
    return () => {
      window.removeEventListener('ai_student_accounts_updated', handleAccountsUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
    };
  }, []);

  // Load saved quiz attempts
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>(() => {
    try {
      const saved = localStorage.getItem('ai_student_quiz_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tutorSessions, setTutorSessions] = useState<TutorHistorySession[]>(() => {
    try {
      const saved = localStorage.getItem('ai_student_tutor_sessions');
      if (saved) return JSON.parse(saved);

      // If no explicit sessions, check messages and create an entry
      const messagesStr = localStorage.getItem('ai_student_tutor_messages');
      if (messagesStr) {
        const msgs = JSON.parse(messagesStr);
        if (Array.isArray(msgs) && msgs.length > 1) {
          const firstUserMsg = msgs.find((m: any) => m.role === 'user');
          if (firstUserMsg) {
            return [
              {
                id: 'session-main',
                title: firstUserMsg.content.slice(0, 60),
                subject: firstUserMsg.subject || 'General',
                timestamp: firstUserMsg.timestamp || Date.now(),
                messageCount: msgs.length,
                preview: msgs[msgs.length - 1]?.content?.slice(0, 120) || '',
                messages: msgs,
              },
            ];
          }
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [solverHistory, setSolverHistory] = useState<ProblemHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_student_solver_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate high level stats
  const totalQuizzes = quizzes.length;
  const avgScore = totalQuizzes > 0
    ? Math.round(quizzes.reduce((acc, q) => acc + q.percentage, 0) / totalQuizzes)
    : 0;
  const totalProblemsSolved = solverHistory.length;
  const totalTutorSessions = tutorSessions.length;
  const totalAccountsSaved = accounts.length;

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history records (quizzes, solved problems, tutor sessions, and saved account history)?')) {
      localStorage.removeItem('ai_student_quiz_history');
      localStorage.removeItem('ai_student_solver_history');
      localStorage.removeItem('ai_student_tutor_sessions');
      localStorage.removeItem('ai_student_account_history');
      localStorage.removeItem('ai_student_saved_accounts');
      setQuizzes([]);
      setSolverHistory([]);
      setTutorSessions([]);
      setAccounts([]);
    }
  };

  const handleRemoveAccount = (emailToRemove: string) => {
    const updated = removeAccountFromHistory(emailToRemove);
    setAccounts(updated);
  };

  const handleExportHistory = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: {
        totalAccountsSaved,
        totalQuizzes,
        avgScore,
        totalProblemsSolved,
        totalTutorSessions,
      },
      savedAccounts: accounts,
      quizzes,
      solverHistory,
      tutorSessions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-student-assistance-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter items
  const filteredAccounts = accounts.filter((a) =>
    (a.email + ' ' + a.displayName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuizzes = quizzes.filter((q) =>
    (q.quizTitle + ' ' + q.topic).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTutor = tutorSessions.filter((t) =>
    (t.title + ' ' + t.subject + ' ' + t.preview).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSolver = solverHistory.filter((s) =>
    (s.problem + ' ' + s.subject + ' ' + s.solution.finalAnswer).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <History className="w-4 h-4" /> Learning Record & Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Study History & Account Log
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Automatically tracks all email accounts used, practice quiz scores, and solved homework problems on this device.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(totalQuizzes > 0 || totalProblemsSolved > 0 || totalTutorSessions > 0 || totalAccountsSaved > 0) && (
            <>
              <button
                onClick={handleExportHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Export history as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/50 transition-colors cursor-pointer"
                title="Clear all recorded history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Saved Accounts</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalAccountsSaved}</div>
          <span className="text-[11px] text-slate-500">Auto-saved in history</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Quizzes Taken</span>
            <HelpCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalQuizzes}</div>
          <span className="text-[11px] text-slate-500">Practice tests completed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Avg Quiz Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-extrabold ${avgScore >= 75 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-slate-200'}`}>
            {totalQuizzes > 0 ? `${avgScore}%` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500">Overall comprehension</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Problems Solved</span>
            <Calculator className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalProblemsSolved}</div>
          <span className="text-[11px] text-slate-500">Step-by-step guides</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Activities', icon: Filter },
            { id: 'accounts', label: `Accounts (${accounts.length})`, icon: Users },
            { id: 'quiz', label: `Quizzes (${quizzes.length})`, icon: HelpCircle },
            { id: 'tutor', label: `AI Tutor (${tutorSessions.length})`, icon: BookOpen },
            { id: 'solver', label: `Solved Problems (${solverHistory.length})`, icon: Calculator },
          ].map((flt) => {
            const Icon = flt.icon;
            return (
              <button
                key={flt.id}
                onClick={() => setActiveFilter(flt.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === flt.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{flt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts or history..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-5">
        {/* 1. AUTO-SAVED ACCOUNTS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'accounts') && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Auto-Saved Accounts ({filteredAccounts.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Every email account you log in with is automatically saved in history here
                </span>
              </div>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In Another Account</span>
                </button>
              )}
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-semibold">No accounts saved in history yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Any email account you use to log in will be automatically recorded in history on this browser.
                </p>
                {onOpenAuthModal && (
                  <button
                    onClick={onOpenAuthModal}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Log In with Email</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredAccounts.map((acc) => {
                  const isActive = currentUser?.email?.toLowerCase() === acc.email.toLowerCase();

                  return (
                    <div
                      key={acc.id || acc.email}
                      className={`p-4 rounded-2xl border transition-all shadow-sm space-y-3 ${
                        isActive
                          ? 'bg-slate-900/95 border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-indigo-500/5'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${acc.avatarColor || 'from-indigo-600 to-purple-600'} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
                            {acc.displayName ? acc.displayName.charAt(0).toUpperCase() : acc.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm block">
                                {acc.displayName}
                              </span>
                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-indigo-300 font-mono block break-all">
                              {acc.email}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveAccount(acc.email)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Remove from saved history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(acc.lastActive || Date.now()).toLocaleDateString()}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">
                            {acc.loginCount || 1} login{(acc.loginCount || 1) > 1 ? 's' : ''}
                          </span>
                        </div>

                        {onSwitchAccount && !isActive && (
                          <button
                            onClick={() => onSwitchAccount(acc.email)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold text-xs transition-colors cursor-pointer ml-auto"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Switch to Account</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. QUIZZES SECTION */}
        {(activeFilter === 'all' || activeFilter === 'quiz') && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" /> Practice Quiz History
            </h3>

            {filteredQuizzes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                No practice quiz records found. Take a quiz in the Practice Quiz tab to record your results!
              </div>
            ) : (
              filteredQuizzes.map((q) => {
                const isExpanded = expandedQuizId === q.id;
                const isPassing = q.percentage >= 70;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{q.quizTitle}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            isPassing ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {q.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Topic: <strong className="text-slate-300">{q.topic}</strong></span>
                          <span>•</span>
                          <span>{q.score} / {q.totalQuestions} correct</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(q.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRetakeQuiz(q.topic)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </button>

                        <button
                          onClick={() => setExpandedQuizId(isExpanded ? null : q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Review Answers'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Quiz Breakdown */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-3">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                          Answer Details:
                        </span>
                        {q.answers.map((ans, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                              ans.isCorrect
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                            }`}
                          >
                            <span className="shrink-0 mt-0.5">
                              {ans.isCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400" />
                              )}
                            </span>
                            <div className="flex-1 space-y-1">
                              <span className="font-semibold text-slate-200 block">
                                Question {idx + 1} {ans.questionText ? `: ${ans.questionText}` : ''}
                              </span>
                              {ans.keyConcept && (
                                <p className="text-[11px] text-slate-400">
                                  <strong>Concept:</strong> {ans.keyConcept}
                                </p>
                              )}
                              {ans.explanation && (
                                <p className="text-[11px] text-slate-300/90 leading-relaxed">
                                  {ans.explanation}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                onAskTutor(
                                  `From my practice quiz on "${q.topic}", can you teach me the core concept behind Question ${idx + 1}?`
                                )
                              }
                              className="text-[11px] text-indigo-400 hover:text-indigo-200 font-semibold shrink-0 cursor-pointer"
                            >
                              Ask Tutor →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 3. SOLVED PROBLEMS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'solver') && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-400" /> Solved Homework Problems
            </h3>

            {filteredSolver.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                No solved problems saved yet. Use the Step-by-Step Solver to work through tough equations!
              </div>
            ) : (
              filteredSolver.map((sol) => {
                const isExpanded = expandedSolverId === sol.id;

                return (
                  <div
                    key={sol.id}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {sol.subject}
                          </span>
                          <span className="font-semibold text-white text-sm line-clamp-1">
                            {sol.problem}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>Final Answer: <strong className="text-emerald-400 font-mono">{sol.solution.finalAnswer}</strong></span>
                          <span>•</span>
                          <span>{new Date(sol.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewSolverProblem(sol.problem)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Open in Solver</span>
                        </button>
                        <button
                          onClick={() => setExpandedSolverId(isExpanded ? null : sol.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Steps' : 'View Steps'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-3">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Step-by-Step Breakdown:
                        </span>
                        {sol.solution.steps.map((st) => (
                          <div key={st.stepNumber} className="text-xs bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-white">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center">
                                {st.stepNumber}
                              </span>
                              <span>{st.title}</span>
                            </div>
                            <p className="font-mono text-indigo-300 pl-7 text-[11px]">{st.action}</p>
                            <p className="text-slate-400 pl-7 text-[11px]">{st.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 4. TUTOR SESSIONS SECTION */}
        {(activeFilter === 'all' || activeFilter === 'tutor') && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" /> AI Tutor Inquiries
            </h3>

            {filteredTutor.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                No previous tutor sessions found. Ask your AI Tutor anything in the AI Tutor tab!
              </div>
            ) : (
              filteredTutor.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {s.subject}
                      </span>
                      <span className="font-semibold text-white text-sm line-clamp-1">
                        "{s.title}"
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">
                      {s.preview}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onAskTutor(`Let's continue discussing: "${s.title}"`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Resume in Tutor</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
