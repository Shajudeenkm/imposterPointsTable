import React, { useState, useRef, useEffect } from 'react';

const TeamCard = ({ team, index, onNameChange, suggestions = [] }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Derive input text
  const inputValue = team.name || '';
  const matchText = inputValue.toLowerCase().trim();

  // Filter available suggestions for autocomplete
  const filtered = suggestions
    .filter((s) => {
      const sName = s.name.toLowerCase();
      return sName.includes(matchText) && sName !== matchText;
    })
    .slice(0, 6); // Max 6 inline suggestions

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (name) => {
    onNameChange(team.teamId, name);
    setShowDropdown(false);
  };

  return (
    <div className="team-card">
      <div className="team-card-header">
        <span className="team-number">Team {index + 1}</span>
      </div>
      <label className="sr-only" htmlFor={`team-name-${team.teamId}`}>
        Team {index + 1} name
      </label>
      
      <div className="autocomplete-wrapper" ref={wrapperRef}>
        <input
          id={`team-name-${team.teamId}`}
          type="text"
          className="team-name-input"
          value={inputValue}
          onChange={(e) => {
            onNameChange(team.teamId, e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={`Team ${index + 1} name`}
          maxLength={30}
          autoComplete="off"
          enterKeyHint="next"
        />

        {showDropdown && filtered.length > 0 && matchText.length > 0 && (
          <ul className="autocomplete-dropdown" role="listbox">
            {filtered.map((s) => (
              <li
                key={s.name}
                className="autocomplete-item"
                role="option"
                aria-selected={false}
                onClick={() => handleSelectSuggestion(s.name)}
              >
                <span>
                  {s.isFavorite && <span style={{ marginRight: 6 }}>⭐</span>}
                  {s.name}
                </span>
                <span className="suggestion-count">
                  {s.count > 0 && `${s.count}×`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TeamCard;