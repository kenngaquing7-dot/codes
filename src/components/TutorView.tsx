import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  BookOpen, 
  Lightbulb, 
  Bot, 
  User, 
  Compass, 
  Copy, 
  Check,
  ChevronDown
} from 'lucide-react';
import { ChatMessage, SubjectCategory, TutorMode, UserProfile } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { speechService } from '../utils/speech';

interface TutorViewProps {
  currentUser?: UserProfile | null;
  onLaunchQuizFromTopic: (topic: string, subject: SubjectCategory) => void;
  onOpenAuthModal?: () => void;
}

const SUBJECTS: { label: SubjectCategory; icon: string }[] = [
  { label: 'General', icon: '🌐' },
  { label: 'Mathematics', icon: '📐' },
  { label: 'Physics', icon: '⚛️' },
  { label: 'Chemistry', icon: '🧪' },
  { label: 'Biology', icon: '🧬' },
  { label: 'Computer Science', icon: '💻' },
  { label: 'History', icon: '🏛️' },
  { label: 'Literature & Writing', icon: '📖' },
  { label: 'Economics', icon: '📊' },
  { label: 'Philosophy', icon: '🧠' },
];

const MODES: { id: TutorMode; name: string; desc: string }[] = [
  { id: 'comprehensive', name: 'Comprehensive', desc: 'Detailed intuition, definitions & examples' },
  { id: 'socratic', name: 'Socratic Method', desc: 'Guided inquiry & thought-provoking hints' },
  { id: 'step_by_step', name: 'Step-by-Step', desc: 'Structured sequential progression' },
  { id: 'analogy', name: 'Analogy (ELI5)', desc: 'Everyday relatable real-world metaphors' },
  { id: 'quick_summary', name: 'Quick Revision', desc: 'High-yield bulleted cheat-sheet summary' },
];

const SAMPLE_QUESTIONS: Record<SubjectCategory, string[]> = {
  General: [
    'How does GPS work using satellite relativity and triangulation?',
    'Why is the sky blue during the day but red at sunset?',
    'What caused the 2008 global financial crisis in simple terms?',
  ],
  Mathematics: [
    'Why can you not divide by zero? Explain conceptually.',
    'How does Bayes Theorem work with an intuitive medical test example?',
    'Derive the Pythagorean theorem visually and explain why it matters.',
  ],
  Physics: [
    'What is the difference between Special and General Relativity?',
    'Explain how Schrödinger\'s cat paradox illustrates quantum superposition.',
    'How do airplanes generate lift using Bernoulli and Newton\'s 3rd law?',
  ],
  Chemistry: [
    'Why is water polar, and why does ice float on water?',
    'Explain Le Chatelier\'s principle with an intuitive balance analogy.',
    'What happens during an oxidation-reduction (redox) reaction at the atomic level?',
  ],
  Biology: [
    'How does mRNA vaccine technology work inside human cells?',
    'Explain the light-dependent reactions of photosynthesis step by step.',
    'What is the CRISPR-Cas9 mechanism and how do bacteria use it as an immune system?',
  ],
  'Computer Science': [
    'What is the difference between TCP and UDP, and when is each used?',
    'Explain Big O notation with real-life analogies (O(1), O(n), O(log n), O(n²)).',
    'How does a Transformer neural network attention mechanism work?',
  ],
  History: [
    'What were the underlying causes that triggered World War I (MAIN factors)?',
    'How did the printing press transform the European Renaissance and Reformation?',
    'Why did the Silk Road decline in importance during the 15th-16th century?',
  ],
  'Literature & Writing': [
    'What is the Hero\'s Journey monomyth framework and how does it apply to modern books?',
    'How do unreliable narrators function in classic literature?',
    'Give practical techniques to avoid passive voice and strengthen thesis arguments.',
  ],
  Economics: [
    'What is inflation, how does central bank interest rate policy curb it?',
    'Explain supply and demand equilibrium and price elasticity of demand.',
    'What is the difference between Fiscal Policy and Monetary Policy?',
  ],
  Philosophy: [
    'Explain the Trolley Problem and how Utilitarianism vs Deontology evaluate it.',
    'What is Plato\'s Allegory of the Cave and what does it say about perception?',
    'What did Descartes mean by "Cogito, ergo sum" (I think, therefore I am)?',
  ],
  Psychology: [
    'How do Pavlovian classical conditioning and Skinner\'s operant conditioning differ?',
    'What is cognitive dissonance and how do people rationalize contradictory beliefs?',
    'Explain how the brain\'s prefrontal cortex vs amygdala interact under stress.',
  ],
};

export const TutorView: React.FC<TutorViewProps> = ({
  currentUser,
  onLaunchQuizFromTopic,
  onOpenAuthModal,
}) => {
  const [subject, setSubject] = useState<SubjectCategory>('General');
  const [mode, setMode] = useState<TutorMode>('comprehensive');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('ai_student_tutor_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const studentGreeting = currentUser ? ` ${currentUser.displayName}` : '';
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `### Welcome${studentGreeting} to your Personal AI Tutor! 🎓\n\nI can help you understand **any concept**, break down tough homework, explain complex theories with intuitive analogies, and prepare for your exams.\n\n* **Ask anything** — from quantum physics to literary analysis, calculus formulas, or historical events.\n* Choose your preferred tutoring style above.\n* You can also turn any answer into a **Practice Quiz** with a single click!\n\nWhat would you like to explore or learn today?`,
        timestamp: Date.now(),
        followUps: [
          'Explain how machine learning works with a cooking analogy',
          'Why does time dilate at near light speeds?',
          'Break down photosynthesis step-by-step',
        ],
      },
    ];
  });

  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('ai_student_tutor_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history to local storage', e);
    }
  }, [messages]);

  // Scroll to bottom on message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Speech listener
  useEffect(() => {
    speechService.setListener((speaking) => {
      if (!speaking) {
        setActiveSpeechMsgId(null);
      }
    });
  }, []);

  // Listen for ask-tutor events from Quiz or Solver
  useEffect(() => {
    const handleAskEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };
    window.addEventListener('ai_student_ask_tutor', handleAskEvent);
    return () => {
      window.removeEventListener('ai_student_ask_tutor', handleAskEvent);
    };
  }, [messages, subject, mode]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      subject,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          subject,
          mode,
          studentName: currentUser?.displayName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here is what I found regarding your question.',
        timestamp: Date.now(),
        followUps: data.followUps || [],
        subject,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      const failMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to fetch response**: ${errorMessage}\n\nPlease verify that your Gemini API key is configured or retry your question.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, failMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeechToggle = (msgId: string, text: string) => {
    if (activeSpeechMsgId === msgId) {
      speechService.stop();
      setActiveSpeechMsgId(null);
    } else {
      speechService.speak(text);
      setActiveSpeechMsgId(msgId);
    }
  };

  const handleCopy = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearChat = () => {
    if (confirm('Clear entire tutoring conversation history?')) {
      speechService.stop();
      setActiveSpeechMsgId(null);
      setMessages([
        {
          id: 'welcome-reset',
          role: 'assistant',
          content: `### Tutor conversation refreshed! ✨\n\nAsk me anything you want to know about **${subject}** or any other subject. I'm ready!`,
          timestamp: Date.now(),
          followUps: SAMPLE_QUESTIONS[subject]?.slice(0, 3) || [],
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto px-2 sm:px-4">
      {/* Subject Selector & Mode Bar */}
      <div className="py-2.5 border-b border-slate-800/80 space-y-2.5">
        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-indigo-400" /> Subject:
          </span>
          {SUBJECTS.map((item) => (
            <button
              key={item.label}
              onClick={() => setSubject(item.label)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                subject === item.label
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Style Selector & Clear */}
        <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Style:
            </span>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.desc}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  mode === m.id
                    ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-900"
            title="Start fresh conversation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 px-1 sm:px-2">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isSpeaking = activeSpeechMsgId === message.id;

          return (
            <div
              key={message.id}
              className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex-1 rounded-2xl px-4 py-3.5 text-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-md max-w-xl'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                ) : (
                  <div>
                    <MarkdownRenderer content={message.content} />

                    {/* Action Bar for Assistant Messages */}
                    <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {/* Audio Speak */}
                        <button
                          onClick={() => handleSpeechToggle(message.id, message.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                            isSpeaking
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          title="Read this explanation aloud"
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Read Aloud</span>
                            </>
                          )}
                        </button>

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Copy explanation"
                        >
                          {copiedMsgId === message.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Convert to Quiz / Flashcards */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            // Extract a clean topic from message content or subject
                            const firstLine = message.content.split('\n')[0].replace(/[*#]/g, '').trim();
                            const quizTopic = firstLine.length > 5 && firstLine.length < 50 ? firstLine : subject;
                            onLaunchQuizFromTopic(quizTopic, subject);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer font-medium text-[11px]"
                          title="Generate a custom practice quiz on this topic"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Practice Quiz on this</span>
                        </button>
                      </div>
                    </div>

                    {/* Suggested Follow-up Questions */}
                    {message.followUps && message.followUps.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400" /> Suggested Follow-Ups:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {message.followUps.map((question, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSendMessage(question)}
                              className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center gap-1.5 group"
                            >
                              <span className="text-indigo-400 text-[11px] group-hover:translate-x-0.5 transition-transform">
                                →
                              </span>
                              <span>{question}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>AI Tutor is preparing your tailored explanation...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Recommended Topics / Sample Chips when few messages */}
      {messages.length <= 2 && !loading && (
        <div className="py-2">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Try asking about {subject}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_QUESTIONS[subject]?.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sample)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors text-left"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div className="pt-2 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl focus-within:border-indigo-500/70 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your AI Tutor anything about ${subject} (e.g. "Explain with an analogy...", "How do I solve...")`}
            rows={1}
            disabled={loading}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm py-3 pl-4 pr-24 focus:outline-none resize-none max-h-40 leading-relaxed"
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-sm transition-all cursor-pointer"
              title="Send question (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between px-2 mt-1 text-[11px] text-slate-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Adaptive AI Learning</span>
        </div>
      </div>
    </div>
  );
};
