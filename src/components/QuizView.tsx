import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  HelpCircle, 
  Sparkles, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Share2, 
  Flame, 
  Check, 
  ChevronRight,
  TrendingUp,
  History,
  Zap
} from 'lucide-react';
import { QuizAttempt, QuizData, QuizDifficulty, QuizQuestion, QuizType, SubjectCategory } from '../types';

interface QuizViewProps {
  initialTopic?: string;
  initialSubject?: SubjectCategory;
  onAskTutor: (questionContext: string) => void;
  onQuizCompleted: () => void;
}

const PRESET_TOPICS = [
  { title: 'Calculus Limits & Derivatives', subject: 'Mathematics' as SubjectCategory },
  { title: 'Cellular Respiration & ATP', subject: 'Biology' as SubjectCategory },
  { title: 'Newtonian Mechanics & Force', subject: 'Physics' as SubjectCategory },
  { title: 'Acids, Bases & pH Calculations', subject: 'Chemistry' as SubjectCategory },
  { title: 'World War II Turning Points', subject: 'History' as SubjectCategory },
  { title: 'Python Algorithms & Big-O', subject: 'Computer Science' as SubjectCategory },
  { title: 'Supply, Demand & Price Elasticity', subject: 'Economics' as SubjectCategory },
  { title: 'Literary Devices & Rhetoric', subject: 'Literature & Writing' as SubjectCategory },
];

export const QuizView: React.FC<QuizViewProps> = ({
  initialTopic = '',
  initialSubject = 'General',
  onAskTutor,
  onQuizCompleted,
}) => {
  // Quiz creation form state
  const [topic, setTopic] = useState(initialTopic || 'General Science');
  const [subject, setSubject] = useState<SubjectCategory>(initialSubject);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quizType, setQuizType] = useState<QuizType>('multiple_choice');
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active quiz session state
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Past quiz history
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>(() => {
    const saved = localStorage.getItem('ai_student_quiz_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  // Update topic if prop changes
  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
    if (initialSubject) {
      setSubject(initialSubject);
    }
  }, [initialTopic, initialSubject]);

  // Timer logic for timedMode
  useEffect(() => {
    if (!quiz || quizSubmitted || !timedMode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired for this question: advance or reveal
          const currentQ = quiz.questions[currentQuestionIndex];
          if (instantFeedback) {
            setRevealedQuestions((r) => ({ ...r, [currentQ.id]: true }));
          } else if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((idx) => idx + 1);
            return 45;
          } else {
            handleSubmitQuiz();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, quizSubmitted, timedMode, currentQuestionIndex, instantFeedback]);

  // Handle generating quiz
  const handleGenerateQuiz = async (customTopic?: string) => {
    const targetTopic = (customTopic || topic).trim();
    if (!targetTopic) return;

    setLoading(true);
    setError(null);
    setQuiz(null);
    setQuizSubmitted(false);
    setUserAnswers({});
    setRevealedQuestions({});
    setCurrentQuestionIndex(0);

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          difficulty,
          questionCount,
          quizType,
          subject,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate quiz (${response.status})`);
      }

      const data: QuizData = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received from quiz generator. Please try again.');
      }

      setQuiz(data);
      setQuizStartTime(Date.now());
      setTimeLeft(45);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting an option
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizSubmitted) return;
    if (instantFeedback && revealedQuestions[questionId]) return;

    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));

    if (instantFeedback) {
      setRevealedQuestions((prev) => ({
        ...prev,
        [questionId]: true,
      }));
    }
  };

  // Advance question
  const handleNextQuestion = () => {
    if (!quiz) return;
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(45);
    } else {
      handleSubmitQuiz();
    }
  };

  // Previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit and calculate results
  const handleSubmitQuiz = () => {
    if (!quiz) return;

    setQuizSubmitted(true);
    const duration = Math.round((Date.now() - quizStartTime) / 1000);
    setTimeSpentSeconds(duration);

    // Calculate score
    let correctCount = 0;
    const answerDetails = quiz.questions.map((q) => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correctAnswerIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        questionText: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        selectedOptionIndex: selected ?? -1,
        isCorrect,
        explanation: q.explanation,
        keyConcept: q.keyConcept,
      };
    });

    const percentage = Math.round((correctCount / quiz.questions.length) * 100);

    // Trigger celebration confetti on high score!
    if (percentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#a855f7', '#3b82f6', '#10b981'],
        });
      } catch {
        // ignore confetti errors
      }
    }

    // Record into history
    const attempt: QuizAttempt = {
      id: `attempt-${Date.now()}`,
      quizTitle: quiz.title,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      percentage,
      date: Date.now(),
      answers: answerDetails,
    };

    const updatedHistory = [attempt, ...quizHistory.slice(0, 19)];
    setQuizHistory(updatedHistory);
    try {
      localStorage.setItem('ai_student_quiz_history', JSON.stringify(updatedHistory));
    } catch {
      // fallback
    }

    onQuizCompleted();
  };

  // Retry missed questions
  const handleRetryMissedQuestions = () => {
    if (!quiz) return;

    const missedQuestions = quiz.questions.filter(
      (q) => userAnswers[q.id] !== q.correctAnswerIndex
    );

    if (missedQuestions.length === 0) return;

    setQuiz({
      ...quiz,
      title: `Retry: ${quiz.title}`,
      questions: missedQuestions,
    });
    setUserAnswers({});
    setRevealedQuestions({});
    setCurrentQuestionIndex(0);
    setQuizSubmitted(false);
    setQuizStartTime(Date.now());
    setTimeLeft(45);
  };

  // Copy Study Sheet Summary
  const handleCopyStudySheet = () => {
    if (!quiz) return;

    let text = `QUIZ STUDY SHEET: ${quiz.title}\nTopic: ${quiz.topic} (${quiz.difficulty.toUpperCase()})\n\n`;
    quiz.questions.forEach((q, idx) => {
      text += `Q${idx + 1}: ${q.question}\n`;
      text += `Correct Answer: ${q.options[q.correctAnswerIndex]}\n`;
      text += `Key Concept: ${q.keyConcept}\n`;
      text += `Explanation: ${q.explanation}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Current Question
  const currentQ = quiz?.questions[currentQuestionIndex];
  const isCurrentRevealed = currentQ ? (quizSubmitted || revealedQuestions[currentQ.id]) : false;
  const currentUserChoice = currentQ ? userAnswers[currentQ.id] : undefined;

  // Grade badge helper
  const getGradeInfo = (percentage: number) => {
    if (percentage >= 95) return { grade: 'A+', label: 'Outstanding Mastery!', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (percentage >= 85) return { grade: 'A', label: 'Excellent Comprehension!', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (percentage >= 75) return { grade: 'B', label: 'Solid Understanding!', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' };
    if (percentage >= 60) return { grade: 'C', label: 'Passing - Review Weak Spots', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { grade: 'F', label: 'Needs Reinforcement', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Quiz Generator Screen (when no active quiz or want to build a new one) */}
      {!quiz && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/20 shadow-xl">
            <div className="flex items-center gap-2.5 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" /> Practice Quiz Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Test & Master Any Subject
            </h2>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Generate custom practice exams tailored precisely to your syllabus, difficulty, and study goals with instantaneous grading and in-depth explanations.
            </p>
          </div>

          {/* Configuration Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
            {/* Topic Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Topic or Concept to Practice
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Quadratic Formula, French Revolution, Data Structures..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>

              {/* Preset Topic Quick Chips */}
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Quick suggestions:</span>
                {PRESET_TOPICS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTopic(preset.title);
                      setSubject(preset.subject);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-indigo-950 hover:text-indigo-200 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['easy', 'medium', 'hard', 'expert'] as QuizDifficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                        difficulty === d
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        questionCount === num
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Format */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Question Format
                </label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value as QuizType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="multiple_choice">Multiple Choice (4 Options)</option>
                  <option value="true_false">True / False Questions</option>
                  <option value="mixed">Mixed Types</option>
                </select>
              </div>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={(e) => setInstantFeedback(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span>Instant Feedback Mode (shows explanation right away)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={timedMode}
                  onChange={(e) => setTimedMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Timed Mode (45s per question)</span>
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={() => handleGenerateQuiz()}
              disabled={loading || !topic.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>AI is crafting your {questionCount}-question quiz...</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  <span>Start Practice Quiz Now</span>
                </>
              )}
            </button>
          </div>

          {/* Past Quiz History */}
          {quizHistory.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-400" /> Recent Practice Sessions
                </h3>
                <span className="text-xs text-slate-500">{quizHistory.length} attempts recorded</span>
              </div>
              <div className="space-y-2">
                {quizHistory.slice(0, 5).map((att) => {
                  const grade = getGradeInfo(att.percentage);
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-200 block text-sm">
                          {att.quizTitle}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Topic: {att.topic} • {new Date(att.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-bold text-slate-200">
                            {att.score}/{att.totalQuestions}
                          </span>
                          <span className="text-slate-400 text-[11px] block">{att.percentage}%</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold border ${grade.bg} ${grade.color}`}>
                          {grade.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Quiz Question Taking Screen */}
      {quiz && !quizSubmitted && currentQ && (
        <div className="space-y-5">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div>
              <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                {quiz.topic} • {quiz.difficulty.toUpperCase()}
              </span>
              <h3 className="font-bold text-white text-base truncate max-w-md">
                {quiz.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Question indicator */}
              <div className="text-right">
                <span className="text-xs font-bold text-slate-200">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
                {timedMode && (
                  <div className={`flex items-center gap-1 text-xs font-mono font-bold justify-end ${
                    timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                  }`}>
                    <Clock className="w-3.5 h-3.5" /> {timeLeft}s
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (confirm('Exit current quiz? Your progress will be lost.')) {
                    setQuiz(null);
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
              >
                Quit
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Question {currentQuestionIndex + 1}
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = currentUserChoice === optIdx;
                const isCorrect = optIdx === currentQ.correctAnswerIndex;
                const letter = String.fromCharCode(65 + optIdx);

                let optionStyle = 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-900';

                if (isCurrentRevealed) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-950/50 border-emerald-500/80 text-emerald-100 shadow-sm shadow-emerald-500/10';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-950/50 border-rose-500/80 text-rose-100';
                  } else {
                    optionStyle = 'bg-slate-950/40 border-slate-850 text-slate-400 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-indigo-600/30 border-indigo-500 text-white font-medium ring-1 ring-indigo-500/50';
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isCurrentRevealed && instantFeedback}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${optionStyle}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${
                        isCurrentRevealed && isCorrect
                          ? 'bg-emerald-500 text-white'
                          : isCurrentRevealed && isSelected && !isCorrect
                          ? 'bg-rose-500 text-white'
                          : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 text-sm pt-0.5 leading-relaxed">{option}</span>
                    {isCurrentRevealed && (
                      <span className="shrink-0 pt-0.5">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        ) : null}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Feedback Explanation Accordion */}
            {isCurrentRevealed && (
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Key Principle & Explanation
                  </span>
                  <button
                    onClick={() => onAskTutor(`In this practice quiz question: "${currentQ.question}", why is "${currentQ.options[currentQ.correctAnswerIndex]}" the correct answer and how does the concept "${currentQ.keyConcept}" work?`)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-200 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Ask AI Tutor for deeper breakdown</span>
                  </button>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>
                    <strong className="text-white">Core Concept:</strong> {currentQ.keyConcept}
                  </p>
                  <p className="text-slate-300">{currentQ.explanation}</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!instantFeedback && userAnswers[currentQ.id] === undefined}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={!instantFeedback && Object.keys(userAnswers).length < quiz.questions.length}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Finish & See Results</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Results Screen */}
      {quiz && quizSubmitted && (
        <div className="space-y-6 animate-fadeIn">
          {(() => {
            const total = quiz.questions.length;
            const correctCount = quiz.questions.filter(
              (q) => userAnswers[q.id] === q.correctAnswerIndex
            ).length;
            const percentage = Math.round((correctCount / total) * 100);
            const grade = getGradeInfo(percentage);
            const missedCount = total - correctCount;

            return (
              <>
                {/* Score Summary Hero Card */}
                <div className="rounded-2xl p-6 sm:p-8 bg-slate-900 border border-slate-800 shadow-xl text-center space-y-4">
                  <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
                    <Award className="w-10 h-10" />
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Quiz Completed • {quiz.topic}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                      {percentage}%
                    </h2>
                    <p className={`text-base font-bold mt-1 ${grade.color}`}>
                      Grade {grade.grade}: {grade.label}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pt-2 border-t border-slate-800/80 max-w-sm mx-auto">
                    <div>
                      <span className="text-slate-500 block">Correct</span>
                      <span className="text-base font-bold text-emerald-400">
                        {correctCount} / {total}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Time Spent</span>
                      <span className="text-base font-bold text-indigo-300">
                        {timeSpentSeconds}s
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Difficulty</span>
                      <span className="text-base font-bold text-slate-200 capitalize">
                        {quiz.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
                    {missedCount > 0 && (
                      <button
                        onClick={handleRetryMissedQuestions}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Retry {missedCount} Missed Questions</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopyStudySheet}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                    >
                      {copiedSummary ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied Study Sheet!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Copy Quiz Study Sheet</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setQuiz(null)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Take Another Quiz</span>
                    </button>
                  </div>
                </div>

                {/* Comprehensive Question Review List */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" /> Comprehensive Question Review
                  </h3>

                  {quiz.questions.map((q, idx) => {
                    const userChoice = userAnswers[q.id];
                    const isCorrect = userChoice === q.correctAnswerIndex;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl p-5 border transition-all ${
                          isCorrect
                            ? 'bg-slate-900/80 border-emerald-500/30'
                            : 'bg-slate-900/80 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Q{idx + 1}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                              </>
                            )}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-white mb-3">
                          {q.question}
                        </h4>

                        <div className="space-y-1.5 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const isAnswerCorrect = optIdx === q.correctAnswerIndex;
                            const isUserSelected = optIdx === userChoice;

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                  isAnswerCorrect
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                    : isUserSelected
                                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                {isAnswerCorrect && (
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                                    Correct Answer
                                  </span>
                                )}
                                {!isAnswerCorrect && isUserSelected && (
                                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                                    Your Choice
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        <div className="mt-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                          <p>
                            <strong className="text-indigo-300">Key Principle:</strong> {q.keyConcept}
                          </p>
                          <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                          <div className="pt-2">
                            <button
                              onClick={() =>
                                onAskTutor(
                                  `I want to understand this quiz question better: "${q.question}". The answer was "${q.options[q.correctAnswerIndex]}". Can you explain the intuition behind "${q.keyConcept}"?`
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-200 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Ask AI Tutor to teach this topic</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
