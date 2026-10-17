export type AcademicLevel = 
  | 'Middle School'
  | 'High School'
  | 'College / Undergraduate'
  | 'Advanced / Scholar'
  | 'Explain Like I\'m 5';

export type SubjectCategory =
  | 'General'
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Computer Science'
  | 'History'
  | 'Literature & Writing'
  | 'Economics'
  | 'Philosophy'
  | 'Psychology';

export type TutorMode = 
  | 'comprehensive'
  | 'socratic'
  | 'step_by_step'
  | 'analogy'
  | 'quick_summary';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  followUps?: string[];
  subject?: SubjectCategory;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type QuizType = 'multiple_choice' | 'true_false' | 'mixed';

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  keyConcept: string;
}

export interface QuizData {
  title: string;
  topic: string;
  difficulty: QuizDifficulty;
  overview: string;
  questions: QuizQuestion[];
  createdAt?: number;
}

export interface QuizAttempt {
  id: string;
  quizTitle: string;
  topic: string;
  difficulty?: QuizDifficulty;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: number;
  answers: {
    questionId: string;
    questionText?: string;
    options?: string[];
    correctAnswerIndex?: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
    explanation?: string;
    keyConcept?: string;
  }[];
}

export interface StepSolution {
  problemSummary: string;
  identifiedGiven: string[];
  goal: string;
  coreFormulas: string[];
  steps: {
    stepNumber: number;
    title: string;
    action: string;
    reasoning: string;
    intermediateResult?: string;
  }[];
  finalAnswer: string;
  verificationCheck?: string;
  proTipAndMistakes: string;
}

export interface ProblemHistoryItem {
  id: string;
  subject: SubjectCategory;
  problem: string;
  timestamp: number;
  solution: StepSolution;
}

export interface TutorHistorySession {
  id: string;
  title: string;
  subject: SubjectCategory;
  timestamp: number;
  messageCount: number;
  preview: string;
  messages: ChatMessage[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  academicLevel?: AcademicLevel;
  avatarColor: string;
  school?: string;
  createdAt: number;
  lastLogin: number;
}

export interface AccountHistoryItem {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  firstLogin: number;
  lastActive: number;
  loginCount: number;
}


