export const en = {
  orders: {
    empty: { title: 'Nothing here' },
    failedToConnect: 'Failed to connect. Please try again.',
    dismiss: 'Not interested — remove this item (recoverable from Trash)',
    saving: 'Saving...',
    good: 'Nothing to reorder yet. Add an item first.',
    count: 'Imported {done} of {total}',
    sample: {
      answer:
        'We replaced a nightly cron that took forty minutes with an incremental job that finishes in under two, which meant the morning report was ready before standup instead of after it, and the on-call rotation stopped getting paged for it.',
    },
  },
} as const
