import { useState, useEffect } from 'react';
import { X, Clock, Calendar, Plus } from 'lucide-react';
import { Button } from './ui/Button.tsx';
import { Input } from './ui/Input.tsx';
import { cn } from '../utils/cn.ts';
import { formatDate, formatTime } from '../utils/dateUtils.ts';
import { useTaskStore } from '../stores/taskStore.ts';
import type { TimePreset } from '../types/index.ts';

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
  const { customTimePresets, addCustomTimePreset, removeCustomTimePreset, removeBuiltInPreset, disabledBuiltInPresets } = useTaskStore();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-[500px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            {mode === 'datetime' ? (
              <Clock size={24} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Current Selection Display */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Selected:</div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatDate(selectedDate)}
              {mode === 'datetime' && (
                <span className="ml-2 text-blue-700 dark:text-blue-300">
                  at {formatTime(selectedDate)}
                </span>
              )}
            </div>
          </div>

          {/* Date Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
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
                <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
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
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={customMinute}
                      onChange={(e) => setCustomMinute(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.hour.toString().padStart(2, '0')}:{preset.minute.toString().padStart(2, '0')}
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(preset, e)}
                      className="absolute -top-1 -right-1 w-6 h-6 p-0 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
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
                      className="w-full justify-start h-10 text-sm border border-dashed border-gray-300 dark:border-gray-600 hover:border-solid hover:border-blue-400 dark:hover:border-blue-500"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {preset.hour.toString().padStart(2, '0')}:{preset.minute.toString().padStart(2, '0')}
                        </span>
                      </div>
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
              Custom {mode === 'datetime' ? 'Date & Time' : 'Date'}
            </h3>
            <div className="flex gap-3">
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleManualDateChange}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {mode === 'datetime' && (
                <input
                  type="time"
                  value={`${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}`}
                  onChange={handleManualTimeChange}
                  className="w-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation?.show && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Remove Quick Time
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                className="bg-red-600 hover:bg-red-700 text-white px-4"
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
