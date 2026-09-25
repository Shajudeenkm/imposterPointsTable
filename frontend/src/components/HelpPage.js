import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SCORING_EXAMPLES = [
  {
    players: 4,
    imposters: 1,
    voters: 3,
    scenarios: [
      { label: 'Nobody catches imposter', imposter: '+3', voters: '−1 each', sum: '0' },
      { label: '1 catches imposter', imposter: '+1', voters: '+1, −1, −1', sum: '0' },
      { label: '2 catch imposter', imposter: '−1', voters: '+1, +1, −1', sum: '0' },
      { label: 'All 3 catch imposter', imposter: '−3', voters: '+1 each', sum: '0' }
    ]
  },
  {
    players: 6,
    imposters: 2,
    voters: 4,
    scenarios: [
      { label: 'Nobody catches either', imposter: '+4 each', voters: '−1 each', sum: '0' },
      { label: 'All catch both', imposter: '−4 each', voters: '+1 each', sum: '0' }
    ]
  }
];

const FAQ_DATA = [
  {
    q: 'How does scoring work in simple terms?',
    a: 'Every non-imposter votes for who they think is the imposter. If you guess correctly, you get +1 point. If you guess wrong, you lose 1 point. The imposter earns +1 for every person they fool and loses 1 for every person who catches them. It\'s a zero-sum game — all points balance out to zero each round.'
  },
  {
    q: 'What is the maximum score an imposter can earn?',
    a: 'The imposter\'s maximum score equals the number of non-imposter voters. For example, with 5 players and 1 imposter, there are 4 voters — so the imposter can earn up to +4 points in a single round if nobody identifies them.'
  },
  {
    q: 'What is the Floor Limit?',
    a: 'The Floor Limit prevents any team\'s score from dropping below a minimum value (usually 0). If a team would go below the floor, their score is clamped to the floor value instead. This keeps the game fun and prevents runaway negative scores. The floor limit only applies to future rounds — it doesn\'t retroactively fix past scores.'
  },
  {
    q: 'How many imposters can there be?',
    a: 'Minimum 1, maximum = total players minus 2. This ensures there are always at least 2 innocent voters. With 3 players, the imposter count is locked to exactly 1. With 10 players, you can have 1 to 8 imposters.'
  },
  {
    q: 'What is Single Vote vs Multi Vote?',
    a: 'In Single Vote mode, each non-imposter picks exactly one suspect. In Multi Vote mode (unlocks at 5+ players), voters can pick up to N suspects where N equals the number of imposters. Multi Vote makes the game harder for imposters because voters can hedge their bets.'
  },
  {
    q: 'Can imposters vote?',
    a: 'By default, imposters do NOT vote. However, you can enable "Allow Imposters to Vote" in the game settings (5+ players required). When enabled, imposter votes count toward their own score in multi-vote mode, adding a strategic layer.'
  },
  {
    q: 'What happens if I close the browser mid-game?',
    a: 'If you\'re logged in, your game is saved to the cloud after every round — just go to History and resume. If you\'re playing as a Guest, the game is stored in your browser\'s local storage and will survive a page refresh, but will be lost if you clear browser data.'
  },
  {
    q: 'Can I undo a round?',
    a: 'No. Rounds are permanent once submitted. This ensures score integrity and prevents cheating. If you make a mistake, you can end the game and start a new one.'
  },
  {
    q: 'How do I play as a Guest?',
    a: 'Click "Play as Guest" on the landing page. You\'ll get the full game experience — team setup, imposter selection, voting, and scoring. At the end of the game, you can choose to save your results to the cloud by creating an account, or discard them.'
  },
  {
    q: 'Can I rematch the same players?',
    a: 'Yes! Go to History or Favorites, find the game, and click "▶ Play Again". This pre-fills all the player names so you can start a new game instantly without re-typing everyone.'
  },
  {
    q: 'Is my game data private?',
    a: 'Yes. Only you can see your games, history, and favorites. Your profile is private by default. You can optionally make your profile public in Settings, which only shows your username, display name, and total games played — never individual game details.'
  },
  {
    q: 'What are the name categories?',
    a: 'We offer 6 categories: Malayalam 🌴 (movie characters), Malayalam Mass 🔥 (funny meme names), Movies (Hollywood), Comedy (sitcom characters), Animals (adjective + animal), and Mythical (fantasy names). The Malayalam categories are always available and required.'
  },
  {
    q: 'Can I play with more than 20 players?',
    a: 'The current maximum is 20 players per game for optimal UX. If you need more, consider splitting into multiple games or contacting us for a custom setup.'
  },
  {
    q: 'Why does the imposter score seem unfair?',
    a: 'It\'s actually perfectly balanced! The imposter is outnumbered, so they get a bigger reward for fooling people. Think of it this way: if 4 people vote and nobody catches the imposter, the imposter gets +4 (one per fooled voter) and each voter gets −1. Total: +4 − 4 = 0. The math always balances.'
  }
];

const HelpPage = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="help-page">
      <div className="help-hero">
        <img src="/Image/logo-icon.png" alt="" className="help-logo" width={64} height={64} />
        <h1>Help & Rules</h1>
        <p>Everything you need to know about Imposter Game — from first round to final score.</p>
      </div>

      {/* QUICK START */}
      <section className="help-section">
        <h2>🚀 Quick Start (3 Steps)</h2>
        <div className="help-steps">
          <div className="help-step">
            <div className="help-step-num">1</div>
            <div>
              <h3>Set Up Teams</h3>
              <p>Add 3–20 player names manually, generate random names from a category, or pick from a favorite game. Optionally set a game name and floor limit.</p>
            </div>
          </div>
          <div className="help-step">
            <div className="help-step-num">2</div>
            <div>
              <h3>Pick the Imposter(s)</h3>
              <p>Each round, secretly choose who the imposter is using the button selector. The number of imposters is capped so at least 2 players are always innocent.</p>
            </div>
          </div>
          <div className="help-step">
            <div className="help-step-num">3</div>
            <div>
              <h3>Vote & Score</h3>
              <p>Every non-imposter votes for who they think is the imposter. Scores update automatically. Play as many rounds as you want, then end the game.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SCORING RULES */}
      <section className="help-section">
        <h2>📊 Scoring Rules</h2>
        <p className="help-intro">
          Scoring is <strong>per-vote</strong>, not majority-based. Every individual guess counts.
        </p>

        <div className="scoring-cards">
          <div className="scoring-card scoring-card-green">
            <div className="scoring-icon">✅</div>
            <h3>Correct Identifier</h3>
            <div className="scoring-points">+1 pt</div>
            <p>A non-imposter who correctly votes for the imposter earns +1 point.</p>
          </div>

          <div className="scoring-card scoring-card-red">
            <div className="scoring-icon">❌</div>
            <h3>Wrong Guess</h3>
            <div className="scoring-points">−1 pt</div>
            <p>A non-imposter who votes for the wrong person loses 1 point.</p>
          </div>

          <div className="scoring-card scoring-card-purple">
            <div className="scoring-icon">🎭</div>
            <h3>Imposter Not Caught</h3>
            <div className="scoring-points">+1 pt per fooled voter</div>
            <p>For every non-imposter who fails to identify you, you earn +1 point. Max = number of voters.</p>
          </div>

          <div className="scoring-card scoring-card-orange">
            <div className="scoring-icon">🔍</div>
            <h3>Imposter Caught</h3>
            <div className="scoring-points">−1 pt per correct guess</div>
            <p>For every non-imposter who correctly identifies you, you lose 1 point.</p>
          </div>
        </div>

        <div className="scoring-formula">
          <h3>📐 The Formula</h3>
          <div className="formula-box">
            <p><strong>Non-imposter score:</strong> +1 (correct) or −1 (wrong)</p>
            <p><strong>Imposter score:</strong> (missed votes) − (correct votes)</p>
            <p><strong>Max imposter score:</strong> +(number of non-imposters) per round</p>
            <p className="formula-note">💡 The total of all scores in a round always equals zero (zero-sum game).</p>
          </div>
        </div>

        {/* SCORING EXAMPLES */}
        <h3 style={{ marginTop: '1.5rem' }}>📋 Examples</h3>
        {SCORING_EXAMPLES.map((ex, i) => (
          <div key={i} className="scoring-example">
            <h4>{ex.players} Players · {ex.imposters} Imposter{ex.imposters > 1 ? 's' : ''} · {ex.voters} Voters</h4>
            <div className="scoring-table-wrap">
              <table className="scoring-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Imposter Gets</th>
                    <th>Voters Get</th>
                    <th>Sum</th>
                  </tr>
                </thead>
                <tbody>
                  {ex.scenarios.map((s, j) => (
                    <tr key={j}>
                      <td>{s.label}</td>
                      <td className={s.imposter.startsWith('+') ? 'text-green' : 'text-red'}>{s.imposter}</td>
                      <td>{s.voters}</td>
                      <td className="text-muted">{s.sum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* FLOOR LIMIT */}
      <section className="help-section">
        <h2>🛡️ Floor Limit</h2>
        <p>
          The Floor Limit sets a minimum score that no team can drop below. It's useful for keeping the game fun and preventing runaway negative scores.
        </p>
        <ul className="help-list">
          <li><strong>Default:</strong> Disabled (scores can go negative)</li>
          <li><strong>Common setting:</strong> Floor = 0 (no negative scores)</li>
          <li><strong>When active:</strong> If a team's score would drop below the floor, it's clamped to the floor value</li>
          <li><strong>Not retroactive:</strong> Changing the floor mid-game only affects future rounds</li>
          <li><strong>Side effect:</strong> With a floor active, the round's total points may be slightly above zero (the floor "creates" points)</li>
        </ul>
      </section>

      {/* IMPOSTER RULES */}
      <section className="help-section">
        <h2>🎭 Imposter Rules</h2>
        <ul className="help-list">
          <li>Imposter count is selected via <strong>buttons only</strong> (no free text)</li>
          <li><strong>Minimum:</strong> 1 imposter per round</li>
          <li><strong>Maximum:</strong> Total players − 2 (must leave at least 2 innocent voters)</li>
          <li><strong>3 players:</strong> Imposter count is locked to exactly 1</li>
          <li>The same player can be imposter in multiple rounds (no rotation enforcement)</li>
          <li>Imposters do NOT vote by default (can be enabled in settings for 5+ players)</li>
        </ul>
      </section>

      {/* GUEST vs ACCOUNT */}
      <section className="help-section">
        <h2>👤 Guest Mode vs Account</h2>
        <div className="help-compare">
          <div className="compare-col">
            <h3>👤 Guest</h3>
            <ul>
              <li>✅ No signup required</li>
              <li>✅ Full game features</li>
              <li>✅ Scores stored in browser</li>
              <li>⚠️ Lost if browser data cleared</li>
              <li>⚠️ No history or favorites</li>
              <li>💡 Can save to cloud at game end</li>
            </ul>
          </div>
          <div className="compare-col">
            <h3>☁️ Account</h3>
            <ul>
              <li>✅ Cloud-saved history</li>
              <li>✅ Favorites & rematch</li>
              <li>✅ Player name suggestions</li>
              <li>✅ Profile & stats</li>
              <li>✅ Cross-device access</li>
              <li>✅ Game sharing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="help-section">
        <h2>❓ Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQ_DATA.map((item, index) => (
            <div
              key={index}
              className={`faq-item ${openFaq === index ? 'faq-open' : ''}`}
            >
              <button
                type="button"
                className="faq-question"
                onClick={() => toggleFaq(index)}
                aria-expanded={openFaq === index}
              >
                <span>{item.q}</span>
                <span className="faq-chevron">{openFaq === index ? '−' : '+'}</span>
              </button>
              {openFaq === index && (
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* TIPS */}
      <section className="help-section">
        <h2>💡 Pro Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>🎯 As a Voter</h4>
            <p>Don't always vote for the same person. Mix up your guesses to keep imposters guessing about what you know.</p>
          </div>
          <div className="tip-card">
            <h4>🎭 As an Imposter</h4>
            <p>Act confused and vote confidently for someone else (if imposter voting is enabled). The more innocent you seem, the more points you earn.</p>
          </div>
          <div className="tip-card">
            <h4>📊 Strategy</h4>
            <p>With the floor limit at 0, playing conservatively early and taking risks later is a solid strategy. Negative scores can't be recovered easily without a floor.</p>
          </div>
          <div className="tip-card">
            <h4>👥 Group Size</h4>
            <p>5–8 players is the sweet spot. Fewer than 4 makes it too easy; more than 12 makes voting chaotic. Use multi-vote mode for larger groups.</p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="help-cta">
        <h2>Ready to play?</h2>
        <p>Jump into a game and test your deduction skills.</p>
        <div className="help-cta-buttons">
          <Link to="/play" className="btn btn-primary btn-lg">🚀 Start a Game</Link>
          <Link to="/" className="btn btn-secondary btn-lg">← Back to Home</Link>
        </div>
      </section>
    </div>
  );
};

export default HelpPage;