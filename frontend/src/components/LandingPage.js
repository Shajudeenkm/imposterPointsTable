import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: '🎮',
    title: 'Guest Play',
    text: 'Full rounds, voting & scores — no signup wall. Jump in in seconds.'
  },
  {
    icon: '☁️',
    title: 'Save to Cloud',
    text: 'At game end, login once and we auto-save every round to your account.'
  },
  {
    icon: '📊',
    title: 'Live Scoring',
    text: 'Per-vote logic, floor limits, imposters capped, full round history.'
  },
  {
    icon: '⭐',
    title: 'Favorites & Rematch',
    text: 'Star games, rematch the same crew, resume unfinished sessions.'
  }
];

const STEPS = [
  { n: '01', title: 'Setup teams', desc: '3–20 players · Malayalam, movies, comedy & more' },
  { n: '02', title: 'Pick imposters', desc: 'Button selector · always leave 2+ innocents' },
  { n: '03', title: 'Vote & score', desc: 'Auto tally · fool or catch · live leaderboard' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { openAuthModal, startGuest, isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  const handlePlayAsGuest = () => {
    startGuest();
    navigate('/play');
  };

  return (
    <div className="landing">
      {/* Ambient background */}
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-orb landing-orb-a" />
        <div className="landing-orb landing-orb-b" />
        <div className="landing-orb landing-orb-c" />
        <div className="landing-grid" />
      </div>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-badge anim-fade-up">
          <span className="landing-badge-dot" />
          Free · Guest mode · Cloud save
        </div>

        <div className="landing-masks anim-fade-up anim-delay-1" aria-hidden="true">
          <span className="mask mask-happy">😊</span>
          <span className="mask mask-drama">🎭</span>
          <span className="mask mask-suspect">😈</span>
        </div>

        <h1 className="landing-title anim-fade-up anim-delay-2">
          Find the{' '}
          <span className="landing-title-glow">Imposter</span>
          <br />
          Own the scoreboard
        </h1>

        <p className="landing-sub anim-fade-up anim-delay-3">
          The sleek score platform for party deduction games. Track every vote,
          every fool, every comeback — play as guest now, save when you want.
        </p>

        <div className="landing-cta anim-fade-up anim-delay-4">
          <button type="button" className="landing-btn-primary" onClick={handlePlayAsGuest}>
            <span>Play as Guest</span>
            <span className="landing-btn-icon">🚀</span>
          </button>
          <button
            type="button"
            className="landing-btn-ghost"
            onClick={() => openAuthModal({ mode: 'login' })}
          >
            Sign In
          </button>
        </div>

        <p className="landing-signup-hint anim-fade-up anim-delay-5">
          New here?{' '}
          <button
            type="button"
            className="landing-text-link"
            onClick={() => openAuthModal({ mode: 'register' })}
          >
            Create a free account
          </button>
        </p>
      </section>

      {/* FEATURES */}
      <section className="landing-features">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            className={`landing-feature-card anim-fade-up anim-delay-${Math.min(i + 2, 5)}`}
          >
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </article>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-how">
        <h2 className="landing-section-title">How a round works</h2>
        <div className="landing-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-num">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="landing-bottom-cta">
        <div className="landing-bottom-card">
          <h2>Ready to expose the imposter?</h2>
          <p>No install. No friction. Scores that actually make sense.</p>
          <button type="button" className="landing-btn-primary" onClick={handlePlayAsGuest}>
            Start free game 🎭
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;