import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  GraduationCap, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye, 
  EyeOff, 
  ArrowLeft, 
  KeyRound, 
  History,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '../types';
import { saveAccountToHistory } from '../utils/accountHistory';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  currentUser: UserProfile | null;
}

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-600 to-indigo-700',
];

const PRESET_ACCOUNTS = [
  {
    email: 'alex.student@school.edu',
    name: 'Alex Johnson',
    password: 'password123',
  },
  {
    email: 'sarah.stem@school.edu',
    name: 'Sarah Chen',
    password: 'password123',
  },
  {
    email: 'leo.miller@school.org',
    name: 'Leo Miller',
    password: 'password123',
  },
];

interface StoredCredential {
  email: string;
  password: string;
  displayName: string;
  createdAt: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  currentUser,
}) => {
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'reset'>('request');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);

  // Initialize and load credentials
  const getCredentials = (): Record<string, StoredCredential> => {
    try {
      const stored = localStorage.getItem('ai_student_user_credentials');
      const creds: Record<string, StoredCredential> = stored ? JSON.parse(stored) : {};

      // Seed preset accounts if missing
      let seeded = false;
      PRESET_ACCOUNTS.forEach((p) => {
        if (!creds[p.email]) {
          creds[p.email] = {
            email: p.email,
            password: p.password,
            displayName: p.name,
            createdAt: Date.now(),
          };
          seeded = true;
        }
      });

      if (seeded) {
        localStorage.setItem('ai_student_user_credentials', JSON.stringify(creds));
      }

      return creds;
    } catch {
      return {};
    }
  };

  useEffect(() => {
    try {
      getCredentials(); // seed if needed
      const stored = localStorage.getItem('ai_student_saved_accounts');
      if (stored) {
        setSavedAccounts(JSON.parse(stored));
      } else if (currentUser?.email) {
        setSavedAccounts([currentUser.email]);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    setError(null);

    // 1. Email checks
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@school.edu).');
      return;
    }

    // 2. Password check
    if (!cleanPassword) {
      setError('Please enter your PASSWORD.');
      return;
    }

    const allCreds = getCredentials();
    const existingUser = allCreds[cleanEmail];

    if (existingUser) {
      // Account exists: verify password
      if (existingUser.password !== cleanPassword) {
        setError('Wrong password for this email. Please check your password or click Forgot Password.');
        return;
      }
    } else {
      // New student registration: require min 4 chars
      if (cleanPassword.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }

      // Save new account credentials
      const namePrefix = cleanEmail.split('@')[0];
      const derivedName = namePrefix
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      allCreds[cleanEmail] = {
        email: cleanEmail,
        password: cleanPassword,
        displayName: derivedName,
        createdAt: Date.now(),
      };

      try {
        localStorage.setItem('ai_student_user_credentials', JSON.stringify(allCreds));
      } catch {
        // ignore
      }
    }

    // Determine display name
    const finalName = existingUser?.displayName || cleanEmail.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const userProfile: UserProfile = {
      id: `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: cleanEmail,
      displayName: finalName,
      avatarColor: currentUser?.email === cleanEmail ? currentUser.avatarColor : randomColor,
      createdAt: existingUser?.createdAt || Date.now(),
      lastLogin: Date.now(),
    };

    // Automatically save this email account in history
    saveAccountToHistory(cleanEmail, finalName, userProfile.avatarColor);

    // Save to list of remembered accounts on this device
    try {
      const updatedList = Array.from(new Set([cleanEmail, ...savedAccounts])).slice(0, 5);
      localStorage.setItem('ai_student_saved_accounts', JSON.stringify(updatedList));
      setSavedAccounts(updatedList);
    } catch {
      // ignore
    }

    onLogin(userProfile);
    onClose();
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = recoveryEmail.trim().toLowerCase();

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setError(null);
    setRecoveryStep('reset');
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const cleanNewPass = newPassword.trim();

    if (!cleanNewPass || cleanNewPass.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    const allCreds = getCredentials();
    const namePrefix = cleanEmail.split('@')[0];
    const derivedName = namePrefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    allCreds[cleanEmail] = {
      email: cleanEmail,
      password: cleanNewPass,
      displayName: allCreds[cleanEmail]?.displayName || derivedName,
      createdAt: allCreds[cleanEmail]?.createdAt || Date.now(),
    };

    try {
      localStorage.setItem('ai_student_user_credentials', JSON.stringify(allCreds));
      saveAccountToHistory(cleanEmail, derivedName);
    } catch {
      // ignore
    }

    setRecoverySuccess(true);
  };

  const handleSelectRecoveredAccount = (recoveredEmail: string) => {
    setEmail(recoveredEmail);
    setPassword('');
    setViewMode('login');
    setRecoverySuccess(false);
    setRecoveryStep('request');
    setError(null);
  };

  const handleSelectPreset = (preset: typeof PRESET_ACCOUNTS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);

    const userProfile: UserProfile = {
      id: `user-${preset.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: preset.email,
      displayName: preset.name,
      avatarColor: AVATAR_COLORS[0],
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    saveAccountToHistory(preset.email, preset.name, AVATAR_COLORS[0]);
    onLogin(userProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {viewMode === 'login' ? (
          <>
            {/* Modal Header */}
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25 mb-1">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {currentUser ? 'Switch or Log In' : 'Student Email Log In'}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Enter your email address and password to access your AI Tutor and study history.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Prominent Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="you@school.edu or your personal email"
                    autoFocus
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* PASSWORD Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    PASSWORD <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot');
                      setError(null);
                      setRecoverySuccess(false);
                      setRecoveryStep('request');
                      setRecoveryEmail(email);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer pt-3"
              >
                <span>Log In with Email</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* 1-Click Demo Profiles */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block text-center uppercase tracking-wider">
                Or test with a sample student account:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_ACCOUNTS.map((preset) => (
                  <button
                    key={preset.email}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 text-left transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                        {preset.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block group-hover:text-indigo-300 transition-colors">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {preset.email} • Pass: <strong className="text-indigo-300 font-mono">{preset.password}</strong>
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Log In →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* FORGOT PASSWORD VIEW */
          <div className="space-y-4 animate-fadeIn">
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Forgot Password
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {recoveryStep === 'request'
                  ? 'Enter your registered email address to reset your password.'
                  : `Create a new password for ${recoveryEmail}.`}
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {recoverySuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-semibold text-sm text-emerald-300">
                    Password Reset Successfully!
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Your new password has been saved for <strong className="text-white font-mono">{recoveryEmail}</strong>. You can now log in directly.
                  </p>
                </div>

                <button
                  onClick={() => handleSelectRecoveredAccount(recoveryEmail)}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Log In with this Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : recoveryStep === 'request' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => {
                        setRecoveryEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="student@school.edu"
                      autoFocus
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Verify Email & Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Step 2: Set New Password */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="At least 4 characters"
                      autoFocus
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Save New Password & Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Previous Accounts on this device */}
            {savedAccounts.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <History className="w-3.5 h-3.5 text-indigo-400" /> Accounts used on this browser:
                </span>
                <div className="space-y-1.5">
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => handleSelectRecoveredAccount(acc)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 hover:text-indigo-300 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-mono">{acc}</span>
                      <span className="text-[11px] text-indigo-400 font-semibold">Select →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Login link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                  setRecoverySuccess(false);
                  setRecoveryStep('request');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
