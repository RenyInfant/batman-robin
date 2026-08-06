import React from 'react';
import { Play, Pause, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

const StageBadge = ({ stage }) => {
  switch (stage) {
    case 'OBSERVATION':
      return (
        <span className="badge badge-observation">
          <Clock size={14} /> Observation Phase
        </span>
      );
    case 'COMPETITION':
      return (
        <span className="badge badge-competition">
          <Play size={14} /> Competition Phase
        </span>
      );
    case 'PAUSED':
      return (
        <span className="badge badge-paused">
          <Pause size={14} /> Paused
        </span>
      );
    case 'FINISHED':
      return (
        <span className="badge badge-finished">
          <CheckCircle size={14} /> Round Finished
        </span>
      );
    case 'IDLE':
    default:
      return (
        <span className="badge badge-idle">
          <ShieldAlert size={14} /> Idle / Standing By
        </span>
      );
  }
};

export default StageBadge;
