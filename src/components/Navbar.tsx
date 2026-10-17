import React, { useState, useRef, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  Calculator, 
  History,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'tutor' | 'quiz' | 'solver' | 'history';
  setActiveTab: (tab: 'tutor' | 'quiz' | 'solver' | 'history') => void;
  isAudioPlaying: boolean;
  onStopAudio: () => void;
  quizCount: number;
  currentUser: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAudioPlaying,
  onStopAudio,
  quizCount,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20 text-white font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  AI Student Assistance
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <Sparkles className="w-2.5 h-2.5" /> 24/7 Smart Companion
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400">
                Interactive AI Tutor & Custom Practice Quizzes
              </p>
            </div>
          </div>

          {/* Controls: Audio & User Auth */}
          <div className="flex items-center gap-2.5">
            {/* Audio Indicator */}
            {isAudioPlaying && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Speaking</span>
                <button
                  onClick={onStopAudio}
                  className="hover:text-emerald-100 transition-colors p-0.5 cursor-pointer"
                  title="Stop reading aloud"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* User Profile / Log In Button */}
            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor || 'from-indigo-600 to-purple-600'} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left text-xs leading-tight">
                    <span className="font-semibold text-slate-200 block truncate max-w-[120px]">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 space-y-2.5 z-50 animate-fadeIn">
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-850 space-y-1">
                      <span className="text-xs font-bold text-white block">
                        {currentUser.displayName}
                      </span>
                      <span className="text-[11px] text-slate-400 block break-all">
                        {currentUser.email}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-800 space-y-1">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onOpenAuthModal();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Switch or Edit Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-900/60 no-scrollbar">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'tutor'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>AI Tutor</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-200 border border-indigo-400/30 hidden sm:inline">
              Ask Anything
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Practice Quiz</span>
            {quizCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/70 text-indigo-300 font-mono">
                {quizCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('solver')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'solver'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Step-by-Step Solver</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
