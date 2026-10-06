// Turns what a button's action returned into the message shown to the person who
// clicked it. Written for someone who has never used the app: say what
// happened, and when it did not work, what to do about it.

export type ActionOutcome = {
  status?: string;
  reason?: string;
  warnings?: string[];
  counts?: Record<string, number>;
  removed?: number;
  tasksRemoved?: number;
};

export type Message = {
  variant: 'success' | 'info' | 'warning' | 'error';
  message: string;
  detailedMessage?: string;
};

export const describeAiOutcome = (subject: 'donor insight' | 'funder report draft', outcome: ActionOutcome): Message => {
  switch (outcome.status) {
    case 'stored': {
      const warnings = outcome.warnings ?? [];

      return warnings.length > 0
        ? {
            variant: 'warning',
            message: `The ${subject} was saved. Please check ${warnings.length === 1 ? 'one thing' : `${warnings.length} things`} first.`,
            detailedMessage: warnings.join(' '),
          }
        : {
            variant: 'success',
            message: `The ${subject} was saved. It is AI-written, so check it before you use it.`,
          };
    }
    case 'skipped':
      return { variant: 'info', message: outcome.reason ?? 'Nothing was created.' };
    case 'rejected':
      return {
        variant: 'warning',
        message: 'The AI answered, but its answer was not saved.',
        detailedMessage: outcome.reason,
      };
    case 'failed':
      return {
        variant: 'error',
        message: 'The AI could not be reached.',
        detailedMessage: `${outcome.reason ?? ''} Check that AI is turned on for your workspace and has credits, then try again.`.trim(),
      };
    case 'not-found':
      return { variant: 'error', message: outcome.reason ?? 'That record could not be found.' };
    default:
      return { variant: 'error', message: 'Something unexpected happened. Please try again.' };
  }
};

export const describeSeedOutcome = (outcome: ActionOutcome): Message =>
  outcome.status === 'created'
    ? {
        variant: 'success',
        message: 'Sample data added. Everything is labeled (SAMPLE). Totals fill in over the next minute.',
      }
    : { variant: 'info', message: 'Sample data is already in your workspace. Use "Remove sample data" first to start over.' };

export const describeRemoveOutcome = (outcome: ActionOutcome): Message =>
  outcome.status === 'removed'
    ? {
        variant: 'success',
        message: `Removed ${outcome.removed ?? 0} sample records and ${outcome.tasksRemoved ?? 0} reminders. Your real records were not touched.`,
      }
    : { variant: 'info', message: 'There was no sample data to remove.' };

export const describeRequestError = (error: unknown): Message => ({
  variant: 'error',
  message: 'That did not work.',
  detailedMessage: error instanceof Error ? error.message : 'Please try again, and tell your administrator if it keeps happening.',
});
