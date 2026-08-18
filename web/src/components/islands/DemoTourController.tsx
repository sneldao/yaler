import React, { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import { createMission } from '../../lib/api';
import { LoaderGrid } from '../primitives/LoaderGrid';

export default function DemoTourController() {
  const [running, setRunning] = useState(false);
  const [stepText, setStepText] = useState<string | null>(null);

  const handleStartTour = async () => {
    setRunning(true);
    setStepText('Setting up a fridge-down job in N1…');

    setTimeout(async () => {
      setStepText('Reading the note and checking the budget…');
      try {
        const goal = "Commercial fridge down, repair before lunch, budget £500, we're in N1.";
        const mission = await createMission(goal);
        setStepText('Job created. Opening the details…');
        setTimeout(() => {
          navigate(`/missions/${mission.id}`);
        }, 400);
      } catch (err: any) {
        setStepText(err.message || 'Could not start the sample job.');
        setTimeout(() => setRunning(false), 2800);
      }
    }, 700);
  };

  return (
    <div className="flex flex-col items-start gap-2 pt-1">
      <button
        type="button"
        onClick={handleStartTour}
        disabled={running}
        className="btn-secondary text-sm"
      >
        {running ? <LoaderGrid /> : null}
        <span>{running ? 'Running the sample…' : 'Try a 60-second sample'}</span>
      </button>

      {stepText && (
        <p className="text-xs text-ink-muted animate-pop-in">{stepText}</p>
      )}
    </div>
  );
}
