// Web Audio API Royalty-Free News Background Music & Audio Synthesizer Engine
// Provides zero-latency, offline newsroom BGM tracks & custom audio management

export interface NewsMusicTrack {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
}

export const BUILTIN_NEWS_TRACKS: NewsMusicTrack[] = [
  {
    id: 'breaking_beat',
    name: '🔴 सुपर ब्रेकिंग बीट (Urgent Beat)',
    category: 'Breaking',
    icon: '⚡',
    description: '128 BPM हाई-इम्पैक्ट ब्रेकिंग पल्स व ड्रम बीट',
  },
  {
    id: 'news_pulse',
    name: '📰 न्यूज़रूम हेडलाइंस (News Pulse)',
    category: 'Headlines',
    icon: '🎙️',
    description: 'इलेक्ट्रॉनिक न्यूज़ टिकर व सिंथ बेस',
  },
  {
    id: 'investigation',
    name: '🔍 खोजी पड़ताल (Investigative Tension)',
    category: 'Tension',
    icon: '🕵️',
    description: 'गंभीर जांच व सस्पेंस ड्रामा टोन',
  },
  {
    id: 'fanfare',
    name: '🎺 विशेष बुलेटिन (Brass Fanfare)',
    category: 'Fanfare',
    icon: '🏆',
    description: 'नाटकीय समाचार बुलेटिन ओपनिंग थीम',
  },
  {
    id: 'ambient',
    name: '🌊 शांत संपादकीय (Ambient Broadcast)',
    category: 'Ambient',
    icon: '📻',
    description: 'सॉफ्ट बैकग्राउंड न्यूज़ म्यूजिक',
  },
];

class NewsAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentTrackId: string | null = null;
  private volume = 0.6;
  private masterGain: GainNode | null = null;
  private timerId: any = null;
  private customAudio: HTMLAudioElement | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.customAudio) {
      this.customAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public playCustomAudio(url: string) {
    this.stop();
    this.customAudio = new Audio(url);
    this.customAudio.loop = true;
    this.customAudio.volume = this.volume;
    this.customAudio.play().catch(() => {});
    this.isPlaying = true;
    this.currentTrackId = 'custom';
  }

  public playTrack(trackId: string) {
    if (this.isPlaying && this.currentTrackId === trackId) return;
    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.isPlaying = true;
    this.currentTrackId = trackId;

    switch (trackId) {
      case 'breaking_beat':
        this.startBreakingBeatLoop();
        break;
      case 'news_pulse':
        this.startNewsPulseLoop();
        break;
      case 'investigation':
        this.startInvestigationLoop();
        break;
      case 'fanfare':
        this.startFanfareLoop();
        break;
      case 'ambient':
        this.startAmbientLoop();
        break;
      default:
        this.startBreakingBeatLoop();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentTrackId = null;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
  }

  public isTrackPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): string | null {
    return this.currentTrackId;
  }

  // --- SYNTHESIZERS ---

  private playTone(freq: number, type: OscillatorType, duration: number, gainVal: number, delayMs = 0) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    setTimeout(() => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch {
        // ignore audio errors
      }
    }, delayMs);
  }

  private playDrumHit(pitch: number, isKick = true, delayMs = 0) {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    setTimeout(() => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(isKick ? 150 : 280, now);
        osc.frequency.exponentialRampToValueAtTime(isKick ? 38 : pitch, now + 0.12);
        g.gain.setValueAtTime(isKick ? 0.9 : 0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch {
        // ignore
      }
    }, delayMs);
  }

  private startBreakingBeatLoop() {
    // 128 BPM = ~468ms per beat
    let step = 0;
    const playBar = () => {
      if (!this.isPlaying) return;
      // Kick on 1 & 3
      this.playDrumHit(45, true, 0);
      this.playTone(110, 'sawtooth', 0.1, 0.25, 0);
      this.playTone(130, 'square', 0.08, 0.2, 117);

      this.playDrumHit(45, true, 468);
      this.playTone(147, 'sawtooth', 0.1, 0.25, 468);
      this.playTone(165, 'square', 0.08, 0.2, 585);

      this.playDrumHit(45, true, 936);
      this.playTone(175, 'sawtooth', 0.12, 0.3, 936);

      this.playDrumHit(45, true, 1404);
      this.playTone(130, 'sawtooth', 0.15, 0.28, 1404);
      this.playTone(220, 'triangle', 0.15, 0.3, 1638);
      step++;
    };
    playBar();
    this.timerId = setInterval(playBar, 1872);
  }

  private startNewsPulseLoop() {
    let step = 0;
    const notes = [220, 261, 293, 330, 293, 261, 196, 220];
    const playPulse = () => {
      if (!this.isPlaying) return;
      const f = notes[step % notes.length];
      this.playTone(f, 'sine', 0.15, 0.4, 0);
      this.playTone(f * 2, 'triangle', 0.08, 0.2, 100);
      if (step % 2 === 0) {
        this.playDrumHit(55, true, 0);
      }
      step++;
    };
    playPulse();
    this.timerId = setInterval(playPulse, 280);
  }

  private startInvestigationLoop() {
    let step = 0;
    const playChord = () => {
      if (!this.isPlaying) return;
      // Dark minor drone chords
      const root = step % 2 === 0 ? 110 : 98; // A2 then G2
      this.playTone(root, 'sawtooth', 2.2, 0.25, 0);
      this.playTone(root * 1.5, 'sine', 2.2, 0.3, 50); // Fifth
      this.playTone(root * 1.2, 'triangle', 2.0, 0.2, 100); // Minor third

      // Clock tick sound every 600ms
      this.playTone(1200, 'sine', 0.03, 0.15, 0);
      this.playTone(1200, 'sine', 0.03, 0.15, 600);
      this.playTone(1200, 'sine', 0.03, 0.15, 1200);
      this.playTone(1200, 'sine', 0.03, 0.15, 1800);
      step++;
    };
    playChord();
    this.timerId = setInterval(playChord, 2400);
  }

  private startFanfareLoop() {
    let step = 0;
    const playFanfare = () => {
      if (!this.isPlaying) return;
      // Dramatic brass staccato notes
      this.playTone(293.66, 'sawtooth', 0.2, 0.45, 0); // D4
      this.playTone(293.66, 'sawtooth', 0.2, 0.45, 200);
      this.playTone(293.66, 'sawtooth', 0.2, 0.45, 400);
      this.playTone(392.00, 'sawtooth', 0.6, 0.55, 600); // G4
      this.playTone(440.00, 'sawtooth', 0.3, 0.5, 1100); // A4
      this.playTone(587.33, 'sawtooth', 0.8, 0.6, 1400); // D5
      this.playDrumHit(45, true, 0);
      this.playDrumHit(45, true, 600);
      this.playDrumHit(45, true, 1400);
      step++;
    };
    playFanfare();
    this.timerId = setInterval(playFanfare, 3200);
  }

  private startAmbientLoop() {
    let step = 0;
    const playAmbient = () => {
      if (!this.isPlaying) return;
      const roots = [220, 246.94, 261.63, 196];
      const r = roots[step % roots.length];
      this.playTone(r, 'sine', 3.0, 0.35, 0);
      this.playTone(r * 1.25, 'triangle', 2.8, 0.25, 200);
      this.playTone(r * 1.5, 'sine', 3.0, 0.3, 400);
      step++;
    };
    playAmbient();
    this.timerId = setInterval(playAmbient, 3000);
  }
}

export const newsAudio = new NewsAudioEngine();
