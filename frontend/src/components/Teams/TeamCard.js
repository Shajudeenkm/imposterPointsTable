import React from 'react';

const TeamCard = ({ team, index, onNameChange }) => {
  return (
    <div className="team-card">
      <div className="team-number">Team {index + 1}</div>
      <input
        type="text"
        className="team-name-input"
        value={team.name}
        onChange={(e) => onNameChange(team.teamId, e.target.value)}
        placeholder={`Team ${index + 1}`}
        maxLength={30}
      />
    </div>
  );
};

export default TeamCard;