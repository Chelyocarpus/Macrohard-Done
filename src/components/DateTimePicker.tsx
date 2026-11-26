import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { X, Clock, Calendar, Plus } from 'lucide-react';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { formatClock, formatDate, formatHour, formatTime } from '../utils/dateUtils.ts';
import { useDateTimePrefs } from '../stores/dateFormatStore.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import { useShallow } from 'zustand/react/shallow';
import type { TimePreset } from '../types/index.ts';
import { useEscapeKey } from '../hooks/useEscapeKey.ts';
import { useFocusTrap } from '../hooks/useFocusTrap.ts';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  mode: 'date' | 'datetime';
  title: string;
}

interface DatePreset {
  id: string;
  label: string;
  getValue: () => Date;
  isWeekend?: boolean;
}

export function DateTimePicker({ value, onChange, onClose, mode, title }: DateTimePickerProps) {
  useDateTimePrefs(); // dates here follow the chosen style, so draw again when it changes
  const { customTimePresets, addCustomTimePreset, removeCustomTimePreset, removeBuiltInPreset, disabledBuiltInPresets } = useTaskStore(useShallow((state) => ({ customTimePresets: state.customTimePresets, addCustomTimePreset: state.addCustomTimePreset, removeCustomTimePreset: state.removeCustomTimePreset, removeBuiltInPreset: state.removeBuiltInPreset, disabledBuiltInPresets: state.disabledBuiltInPresets })));
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());
  const [selectedTime, setSelectedTime] = useState<{ hour: number; minute: number }>(() => {
    if (value) {
      return { hour: value.getHours(), minute: value.getMinutes() };
    }
    return { hour: 9, minute: 0 }; // Default to 9 AM
  });
  const [showCustomTimeForm, setShowCustomTimeForm] = useState(false);
  const [customTimeLabel, setCustomTimeLabel] = useState('');
  const [customHour, setCustomHour] = useState(9);
  const [customMinute, setCustomMinute] = useState(0);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ preset: TimePreset; show: boolean } | null>(null);

  // Built-in time presets
  const builtInTimePresets: TimePreset[] = [
    { id: 'morning', label: 'Morning', hour: 9, minute: 0, isCustom: false, createdAt: new Date() },
    { id: 'lunch', label: 'Lunch', hour: 12, minute: 0, isCustom: false, createdAt: new Date() },
    { id: 'afternoon', label: 'Afternoon', hour: 15, minute: 0, isCustom: false, createdAt: new Date() },
    { id: 'evening', label: 'Evening', hour: 18, minute: 0, isCustom: false, createdAt: new Date() },
    { id: 'night', label: 'Night', hour: 21, minute: 0, isCustom: false, createdAt: new Date() },
  ];

  // Smart date presets
  const datePresets: DatePreset[] = [
    {
      id: 'today',
      label: 'Today',
      getValue: () => new Date(),
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      getValue: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      },
    },
    {
      id: 'this-weekend',
      label: 'This Weekend',
      isWeekend: true,
      getValue: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysUntilSaturday = (6 - dayOfWeek) % 7;
        const saturday = new Date();
        saturday.setDate(now.getDate() + daysUntilSaturday);
        return saturday;
      },
    },
    {
      id: 'next-week',
      label: 'Next Week',
      getValue: () => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      },
    },
    {
      id: 'next-monday',
      label: 'Next Monday',
      getValue: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const nextMonday = new Date();
        nextMonday.setDate(now.getDate() + daysUntilNextMonday);
        return nextMonday;
      },
    },
    {
      id: 'next-friday',
      label: 'Next Friday',
      getValue: () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysUntilNextFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
        const nextFriday = new Date();
        nextFriday.setDate(now.getDate() + daysUntilNextFriday);
        return nextFriday;
      },
    },
  ];

  // Combine built-in and custom time presets, filtering out disabled built-in ones
  const allTimePresets = [
    ...builtInTimePresets.filter(preset => !disabledBuiltInPresets.includes(preset.id)), 
    ...customTimePresets
  ];

  const handleDatePresetClick = (preset: DatePreset) => {
    const newDate = preset.getValue();
    if (mode === 'datetime') {
      newDate.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
    } else {
      newDate.setHours(12, 0, 0, 0); // Default to noon for date-only
    }
    setSelectedDate(newDate);
  };

  const handleTimePresetClick = (preset: TimePreset) => {
    setSelectedTime({ hour: preset.hour, minute: preset.minute });
    const newDate = new Date(selectedDate);
    newDate.setHours(preset.hour, preset.minute, 0, 0);
    setSelectedDate(newDate);
  };

  const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const newDate = new Date(e.target.value + 'T12:00:00');
      if (mode === 'datetime') {
        newDate.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
      }
      setSelectedDate(newDate);
    }
  };

  const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [hours, minutes] = e.target.value.split(':').map(Number);
      setSelectedTime({ hour: hours, minute: minutes });
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleAddCustomPreset = () => {
    if (customTimeLabel.trim()) {
      addCustomTimePreset(customTimeLabel.trim(), customHour, customMinute);
      setCustomTimeLabel('');
      setCustomHour(9);
      setCustomMinute(0);
      setShowCustomTimeForm(false);
    }
  };

  const handleApply = () => {
    onChange(selectedDate);
    onClose();
  };

  const handleDeleteClick = (preset: TimePreset, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the preset from being selected
    setDeleteConfirmation({ preset, show: true });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation?.preset) {
      if (deleteConfirmation.preset.isCustom) {
        removeCustomTimePreset(deleteConfirmation.preset.id);
      } else {
        removeBuiltInPreset(deleteConfirmation.preset.id);
      }
    }
    setDeleteConfirmation(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Update selected date/time when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedTime({ hour: value.getHours(), minute: value.getMinutes() });
    }
  }, [value]);

  // The picker is only mounted while it is open. Escape closes just the picker (not the task panel behind it).
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeKey(true, onClose, { back: true });
  useFocusTrap(dialogRef, true);

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      {/* Phones: fills the whole screen; larger screens: centred card */}
      <div className="relative flex flex-col w-full h-full sm:h-auto sm:w-[500px] sm:max-w-[calc(100vw-2rem)] sm:max-h-[80vh] bg-canvas sm:rounded-2xl shadow-2xl sm:border border-line overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:py-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line bg-sidebar">
          <div className="flex items-center gap-3">
            {mode === 'datetime' ? (
              <Clock size={24} className="text-accent" />
            ) : (
              <Calendar size={24} className="text-accent" />
            )}
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-hover rounded-full"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 min-h-0 sm:flex-none sm:max-h-[60vh] overflow-y-auto">
          {/* Current Selection Display */}
          <div className="mb-6 p-4 bg-accent/10 rounded-xl border border-accent/30">
            <div className="text-sm text-accent font-medium mb-1">Selected:</div>
            <div className="text-lg font-semibold text-ink">
              {formatDate(selectedDate)}
              {mode === 'datetime' && (
                <span className="ml-2 text-accent">
                  at {formatTime(selectedDate)}
                </span>
              )}
            </div>
          </div>

          {/* Date Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-ink mb-3 uppercase tracking-wide">
              Quick Dates
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDatePresetClick(preset)}
                  className={cn(
                    "justify-start h-10 transition-all duration-200",
                    preset.isWeekend && "border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Presets (only in datetime mode) */}
          {mode === 'datetime' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-ink uppercase tracking-wide">
                  Quick Times
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomTimeForm(!showCustomTimeForm)}
                  className="text-xs flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add Custom
                </Button>
              </div>

              {/* Custom Time Form */}
              {showCustomTimeForm && (
                <div className="mb-4 p-4 bg-sidebar rounded-lg border border-line">
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Label (e.g., 'Daily Standup')"
                      value={customTimeLabel}
                      onChange={(e) => setCustomTimeLabel(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <select
                      value={customHour}
                      onChange={(e) => setCustomHour(Number(e.target.value))}
                      className="px-3 py-2 border border-line rounded-lg bg-canvas text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatHour(i)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={customMinute}
                      onChange={(e) => setCustomMinute(Number(e.target.value))}
                      className="px-3 py-2 border border-line rounded-lg bg-canvas text-sm"
                    >
                      {[0, 15, 30, 45].map((minute) => (
                        <option key={minute} value={minute}>
                          {minute.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddCustomPreset}
                      size="sm"
                      disabled={!customTimeLabel.trim()}
                      className="text-xs"
                    >
                      Save Preset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomTimeForm(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {allTimePresets.map((preset) => (
                  <div key={preset.id} className="relative">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTimePresetClick(preset)}
                      className="w-full justify-start h-10 text-sm"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-muted">
                          {formatClock(preset.hour, preset.minute)}
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(preset, e)}
                      className="hit-area absolute -top-1 -right-1 w-7 h-7 p-0 rounded-full bg-overdue/15 hover:bg-overdue/20 text-overdue"
                      title={`Remove ${preset.label}`}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Restore Disabled Presets */}
          {disabledBuiltInPresets.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-ink mb-3 uppercase tracking-wide">
                Restore Built-in Times
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {builtInTimePresets
                  .filter(preset => disabledBuiltInPresets.includes(preset.id))
                  .map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => useTaskStore.getState().restoreBuiltInPreset(preset.id)}
                      className="w-full justify-start h-10 text-sm border border-dashed border-line hover:border-solid hover:border-accent"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-muted">
                          {formatClock(preset.hour, preset.minute)}
                        </span>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-ink mb-3 uppercase tracking-wide">
              Custom {mode === 'datetime' ? 'Date & Time' : 'Date'}
            </h3>
            <div className="flex gap-3">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={handleManualDateChange}
                className="flex-1 p-3 border border-line rounded-lg bg-canvas focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
              {mode === 'datetime' && (
                <input
                  type="time"
                  value={`${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}`}
                  onChange={handleManualTimeChange}
                  className="w-32 p-3 border border-line rounded-lg bg-canvas focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-line bg-sidebar">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-accent hover:bg-accent-hover text-on-accent px-6"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation?.show && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-canvas rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-ink mb-2">
              Remove Quick Time
            </h3>
            <p className="text-muted mb-6">
              Are you sure you want to remove "{deleteConfirmation.preset.label}"? 
              {!deleteConfirmation.preset.isCustom && (
                <span className="block mt-1 text-sm text-orange-600 dark:text-orange-400">
                  This is a built-in preset that can be restored later.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleCancelDelete}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-overdue hover:bg-overdue/90 text-on-accent px-4"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
