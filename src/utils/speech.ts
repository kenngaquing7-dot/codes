// Text-to-speech helper utility using Web Speech API

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChangeCallback: ((speaking: boolean, paused: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return this.synth !== null;
  }

  public setListener(cb: (speaking: boolean, paused: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  private notify() {
    if (this.onStateChangeCallback && this.synth) {
      this.onStateChangeCallback(this.synth.speaking, this.synth.paused);
    }
  }

  public speak(text: string, rate: number = 1.0) {
    if (!this.synth) return;

    this.stop();

    // Clean markdown symbols to make speech natural
    const cleanText = text
      .replace(/###?\s+/g, '')
      .replace(/[*_`#~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/---FOLLOW_UPS---[\s\S]*/, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Pick an English voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => this.notify();
    utterance.onend = () => {
      this.currentUtterance = null;
      this.notify();
    };
    utterance.onerror = () => {
      this.currentUtterance = null;
      this.notify();
    };
    utterance.onpause = () => this.notify();
    utterance.onresume = () => this.notify();

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    this.notify();
  }

  public pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.notify();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.notify();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      this.notify();
    }
  }
}

export const speechService = new SpeechService();
