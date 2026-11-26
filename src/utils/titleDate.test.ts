import { describe, expect, it } from 'vitest';
import { applyTitleDate, parseTitleDate } from './titleDate.ts';

// Wednesday, 25 November 2026, in the afternoon: the time of day must never leak into the due date
const NOW = new Date(2026, 10, 25, 15, 40);
const nov = (date: number) => new Date(2026, 10, date);
const dec = (date: number) => new Date(2026, 11, date);

describe('parseTitleDate', () => {
  it('takes "today" and "tomorrow" off the end of the title', () => {
    expect(parseTitleDate('Call Mom tomorrow', NOW)).toMatchObject({ title: 'Call Mom', dueDate: nov(26) });
    expect(parseTitleDate('Pay rent today', NOW)).toMatchObject({ title: 'Pay rent', dueDate: nov(25) });
  });

  it('ignores case and trailing punctuation, and drops a dangling comma', () => {
    expect(parseTitleDate('Call Mom TOMORROW!', NOW)).toMatchObject({ title: 'Call Mom', dueDate: nov(26) });
    expect(parseTitleDate('Call Mom, tomorrow.', NOW)).toMatchObject({ title: 'Call Mom' });
  });

  it('means the next weekday after today, never today itself', () => {
    expect(parseTitleDate('Gym friday', NOW)?.dueDate).toEqual(nov(27));
    expect(parseTitleDate('Gym on monday', NOW)?.dueDate).toEqual(nov(30));
    expect(parseTitleDate('Standup wednesday', NOW)?.dueDate).toEqual(dec(2)); // today is a Wednesday
  });

  it('takes the little words in front of the date with it', () => {
    expect(parseTitleDate('Send report by friday', NOW)).toMatchObject({ title: 'Send report', dueDate: nov(27) });
    expect(parseTitleDate('Dentist next tuesday', NOW)).toMatchObject({ title: 'Dentist', dueDate: dec(1) });
  });

  it('understands "next week" (the coming Monday) and "in N days/weeks"', () => {
    expect(parseTitleDate('Plan trip next week', NOW)?.dueDate).toEqual(nov(30));
    expect(parseTitleDate('Water plants in 3 days', NOW)?.dueDate).toEqual(nov(28));
    expect(parseTitleDate('Review in 1 day', NOW)?.dueDate).toEqual(nov(26));
    expect(parseTitleDate('Review in 2 weeks', NOW)?.dueDate).toEqual(dec(9));
  });

  it('gives midnight, whatever the time of day is now', () => {
    const due = parseTitleDate('Call Mom tomorrow', NOW)!.dueDate;
    expect([due.getHours(), due.getMinutes(), due.getSeconds(), due.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it('crosses a month and a year end', () => {
    expect(parseTitleDate('Party tomorrow', new Date(2026, 11, 31, 9))?.dueDate).toEqual(new Date(2027, 0, 1));
    expect(parseTitleDate('Rent in 1 week', new Date(2026, 1, 25, 9))?.dueDate).toEqual(new Date(2026, 2, 4));
  });

  it('leaves a title alone when the date is not at the end', () => {
    expect(parseTitleDate('Tomorrow call Mom', NOW)).toBeNull();
    expect(parseTitleDate('Friday night plans', NOW)).toBeNull();
    expect(parseTitleDate("Buy tomorrow's newspaper", NOW)).toBeNull();
  });

  it('leaves a title alone when nothing would be left of it', () => {
    expect(parseTitleDate('tomorrow', NOW)).toBeNull();
    expect(parseTitleDate('  Friday', NOW)).toBeNull();
    expect(parseTitleDate('by friday', NOW)).toBeNull();
  });

  it('leaves a title alone when the words only look like a date', () => {
    expect(parseTitleDate('Call someone intomorrow', NOW)).toBeNull();
    expect(parseTitleDate('Meet the Fridays', NOW)).toBeNull();
    expect(parseTitleDate('Read chapter in 0 days', NOW)).toBeNull();
    expect(parseTitleDate('Wait in 999 days', NOW)).toBeNull(); // more than a year away
    expect(parseTitleDate('Buy milk', NOW)).toBeNull();
    expect(parseTitleDate('', NOW)).toBeNull();
  });
});

describe('applyTitleDate', () => {
  it('replaces the title and sets the due date, keeping the other options', () => {
    const result = applyTitleDate('Call Mom tomorrow', { myDay: true }, NOW);
    expect(result.title).toBe('Call Mom');
    expect(result.options).toEqual({ myDay: true, dueDate: nov(26) });
  });

  it('wins over the date a view starts tasks with (Planned starts them due today)', () => {
    const result = applyTitleDate('Call Mom friday', { dueDate: nov(25) }, NOW);
    expect(result.options.dueDate).toEqual(nov(27));
  });

  it('returns the very same title and options when there is no date', () => {
    const options = { important: true };
    const result = applyTitleDate('Buy milk', options, NOW);
    expect(result.title).toBe('Buy milk');
    expect(result.options).toBe(options);
  });
});
