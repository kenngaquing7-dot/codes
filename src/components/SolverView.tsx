import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import { StepSolution, SubjectCategory, ProblemHistoryItem } from '../types';

interface SolverViewProps {
  initialProblem?: string;
  onAskTutor: (context: string) => void;
}

const SAMPLE_PROBLEMS = [
  {
    subject: 'Mathematics',
    problem: 'Solve for x: 2x² - 7x + 3 = 0 using factoring and the quadratic formula.',
  },
  {
    subject: 'Physics',
    problem: 'A car accelerates uniformly from rest to 28 m/s in 7.0 seconds. How far did the car travel during this time?',
  },
  {
    subject: 'Chemistry',
    problem: 'How many grams of CO2 are produced when 44.0 grams of propane (C3H8) are completely combusted in oxygen?',
  },
];

export const SolverView: React.FC<SolverViewProps> = ({ initialProblem = '', onAskTutor }) => {
  const [problem, setProblem] = useState(initialProblem);
  const [subject, setSubject] = useState<SubjectCategory>('Mathematics');
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<StepSolution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProblem) {
      setProblem(initialProblem);
      handleSolve(initialProblem);
    }
  }, [initialProblem]);

  const handleSolve = async (customProblem?: string) => {
    const text = (customProblem || problem).trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setSolution(null);

    try {
      const response = await fetch('/api/solve/step-by-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: text, subject }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to solve problem (${response.status})`);
      }

      const data: StepSolution = await response.json();
      setSolution(data);

      // Save to solver history
      try {
        const existingStr = localStorage.getItem('ai_student_solver_history');
        const existing: ProblemHistoryItem[] = existingStr ? JSON.parse(existingStr) : [];
        const newItem: ProblemHistoryItem = {
          id: `problem-${Date.now()}`,
          subject,
          problem: text,
          timestamp: Date.now(),
          solution: data,
        };
        const updated = [newItem, ...existing.slice(0, 29)];
        localStorage.setItem('ai_student_solver_history', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save problem to history', err);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to solve problem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-emerald-950/40 border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Calculator className="w-4 h-4" /> Homework & Problem Guide
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Step-by-Step Problem Solver
        </h2>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Stuck on a tricky homework question or formula? Get structured step-by-step solutions that explain the reasoning and methods behind every single move.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Subject Domain
          </label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'] as SubjectCategory[]).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSubject(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  subject === subj
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Enter Homework Problem or Equation
          </label>
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Type or paste your problem here... (e.g. Find the derivative of f(x) = (3x² + 2) / (x - 1), or a physics word problem)"
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 leading-relaxed"
          />

          {/* Quick Examples */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Try sample:</span>
            {SAMPLE_PROBLEMS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSubject(s.subject as SubjectCategory);
                  setProblem(s.problem);
                }}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 truncate max-w-xs transition-colors"
              >
                {s.problem.slice(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={() => handleSolve()}
          disabled={loading || !problem.trim()}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing problem and calculating step-by-step...</span>
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4" />
              <span>Solve & Explain Step-by-Step</span>
            </>
          )}
        </button>
      </div>

      {/* Solution Display */}
      {solution && (
        <div className="space-y-5 animate-fadeIn">
          {/* Summary & Core Concepts */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-indigo-400" /> Problem Breakdown
              </h3>
              <button
                onClick={() =>
                  onAskTutor(
                    `Can you explain the mathematical intuition and alternative approaches for solving this problem: "${solution.problemSummary}"?`
                  )
                }
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-200"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Discuss with AI Tutor</span>
              </button>
            </div>

            <p className="text-sm text-slate-200">{solution.problemSummary}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-indigo-300 block mb-1">🎯 Identified Goal</span>
                <span className="text-slate-300">{solution.goal}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-indigo-300 block mb-1">📐 Core Formulas / Concepts</span>
                <div className="space-y-0.5">
                  {solution.coreFormulas.map((f, i) => (
                    <div key={i} className="font-mono text-emerald-400">{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sequential Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Step-by-Step Resolution
            </h4>
            {solution.steps.map((st) => (
              <div
                key={st.stepNumber}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {st.stepNumber}
                  </span>
                  <span className="font-semibold text-white text-sm">{st.title}</span>
                </div>

                <div className="text-xs text-slate-300 pl-8 space-y-1.5">
                  <p className="font-mono text-indigo-200 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    {st.action}
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    <strong className="text-slate-300">Why:</strong> {st.reasoning}
                  </p>
                  {st.intermediateResult && (
                    <div className="text-emerald-400 font-semibold font-mono text-[11px] pt-1">
                      Result: {st.intermediateResult}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Final Answer Banner */}
          <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Final Verified Answer
            </span>
            <div className="text-base sm:text-lg font-mono font-bold text-white bg-slate-950/90 p-3 rounded-xl border border-emerald-500/30">
              {solution.finalAnswer}
            </div>
            {solution.verificationCheck && (
              <p className="text-xs text-emerald-300/80 pt-1">
                <strong>Verification:</strong> {solution.verificationCheck}
              </p>
            )}
          </div>

          {/* Pro-Tips & Traps to Avoid */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block mb-0.5">Exam Pro-Tip & Common Pitfalls:</strong>
              <p className="leading-relaxed text-slate-300">{solution.proTipAndMistakes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
