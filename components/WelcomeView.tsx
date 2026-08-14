import React, { useState } from 'react';
import { LayoutDashboard, Target, Database, Users, ArrowRight, Activity } from 'lucide-react';

interface WelcomeViewProps {
  organizationName: string;
  onDismiss: () => Promise<void>;
}

const AREAS = [
  {
    icon: LayoutDashboard,
    title: 'Impact Overview',
    body: 'Your dashboard — the numbers your organization has entered, read at a glance.',
  },
  {
    icon: Target,
    title: 'Grant Tracking',
    body: 'Every awarded grant, its KPIs, and how spending compares to the timeline.',
  },
  {
    icon: Database,
    title: 'Manage Data',
    body: 'Where your real numbers get entered — by hand or by importing a CSV.',
  },
  {
    icon: Users,
    title: 'Team',
    body: 'Invite colleagues and set what each person can see and edit.',
  },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({ organizationName, onDismiss }) => {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleGetStarted = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
    } catch (error) {
      console.error('Could not dismiss welcome step:', error);
      setIsDismissing(false);
    }
  };

  return (
    <div className="compass-canvas min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="max-w-2xl w-full py-12">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-semibold text-ivory tracking-tight mb-2">
            Welcome to Nomad Compass
          </h1>
          <p className="text-inkmute">
            <span className="text-parchment font-semibold">{organizationName}</span> is set up. Here's a
            quick look at where things live.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {AREAS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface rounded-2xl p-5 border border-hairline flex items-start gap-4">
              <div className="p-2.5 bg-teal/10 border border-teal/25 rounded-xl text-teal shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-bold text-parchment text-sm mb-1">{title}</h3>
                <p className="text-xs text-inkmute leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGetStarted}
          disabled={isDismissing}
          className="w-full bg-gradient-to-b from-brassbright to-brass text-[#26200e] py-4 rounded-2xl font-black text-lg hover:brightness-105 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isDismissing ? (
            <>
              <Activity className="animate-spin" size={20} />
              One moment…
            </>
          ) : (
            <>
              Get Started <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
