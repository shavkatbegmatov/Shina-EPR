import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  CalendarDays,
} from 'lucide-react';
import clsx from 'clsx';

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRangePreset;
  customRange: DateRange;
  onChange: (preset: DateRangePreset, customRange?: DateRange) => void;
  className?: string;
}

const PRESET_OPTIONS: { value: DateRangePreset; label: string; icon?: string }[] = [
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'quarter', label: 'Chorak' },
  { value: 'year', label: 'Yil' },
  { value: 'custom', label: 'Maxsus' },
];

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const WEEKDAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export function DateRangePicker({
  value,
  customRange,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempStart, setTempStart] = useState<string>(customRange.start);
  const [tempEnd, setTempEnd] = useState<string>(customRange.end);
  const [selectingStart, setSelectingStart] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (customRange.start) setTempStart(customRange.start);
    if (customRange.end) setTempEnd(customRange.end);
  }, [customRange]);

  const getPresetLabel = () => {
    if (value === 'custom' && customRange.start && customRange.end) {
      return `${formatDisplayDate(customRange.start)} - ${formatDisplayDate(customRange.end)}`;
    }
    return PRESET_OPTIONS.find((opt) => opt.value === value)?.label || 'Tanlang';
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
  };

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCalendar(true);
      setSelectingStart(true);
      const today = new Date();
      setCurrentMonth(today);
      if (!tempStart) {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setTempStart(weekAgo.toISOString().split('T')[0]);
        setTempEnd(today.toISOString().split('T')[0]);
      }
    } else {
      onChange(preset);
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    if (selectingStart) {
      setTempStart(dateStr);
      setTempEnd('');
      setSelectingStart(false);
    } else {
      if (new Date(dateStr) < new Date(tempStart)) {
        setTempStart(dateStr);
        setTempEnd(tempStart);
      } else {
        setTempEnd(dateStr);
      }
      setSelectingStart(true);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStart && tempEnd) {
      onChange('custom', { start: tempStart, end: tempEnd });
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    const startDay = (firstDay.getDay() + 6) % 7; // Adjust for Monday start
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isInRange = (date: Date) => {
    if (!tempStart || !tempEnd) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= tempStart && dateStr <= tempEnd;
  };

  const isStartDate = (date: Date) => {
    return date.toISOString().split('T')[0] === tempStart;
  };

  const isEndDate = (date: Date) => {
    return date.toISOString().split('T')[0] === tempEnd;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 rounded-xl border px-4 py-2 transition-all',
          'hover:border-primary/50 hover:bg-base-200/50',
          isOpen
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : 'border-base-300 bg-base-100'
        )}
      >
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="font-medium">{getPresetLabel()}</span>
        <ChevronRight
          className={clsx(
            'h-4 w-4 text-base-content/50 transition-transform',
            isOpen && 'rotate-90'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={clsx(
            'absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-xl',
            'animate-dropdown',
            showCalendar ? 'w-[340px]' : 'w-56'
          )}
        >
          {!showCalendar ? (
            /* Preset Options */
            <div className="p-2">
              <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Tez tanlash
              </div>
              {PRESET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePresetSelect(option.value)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors',
                    value === option.value && option.value !== 'custom'
                      ? 'bg-primary text-primary-content'
                      : 'hover:bg-base-200'
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {value === option.value && option.value !== 'custom' && (
                    <Check className="h-4 w-4" />
                  )}
                  {option.value === 'custom' && (
                    <Calendar className="h-4 w-4 text-base-content/50" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Calendar View */
            <div className="p-4">
              {/* Calendar Header */}
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="rounded-lg p-1.5 transition-colors hover:bg-base-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold">
                  {MONTHS_UZ[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={() => navigateMonth('next')}
                  className="rounded-lg p-1.5 transition-colors hover:bg-base-200"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Selected Range Display */}
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-base-200/50 p-2">
                <div
                  className={clsx(
                    'flex-1 rounded-lg px-3 py-2 text-center text-sm transition-colors',
                    selectingStart
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100'
                  )}
                >
                  <div className="text-xs opacity-70">Boshlanish</div>
                  <div className="font-medium">
                    {tempStart ? formatDisplayDate(tempStart) : '—'}
                  </div>
                </div>
                <div className="text-base-content/30">→</div>
                <div
                  className={clsx(
                    'flex-1 rounded-lg px-3 py-2 text-center text-sm transition-colors',
                    !selectingStart
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100'
                  )}
                >
                  <div className="text-xs opacity-70">Tugash</div>
                  <div className="font-medium">
                    {tempEnd ? formatDisplayDate(tempEnd) : '—'}
                  </div>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS_UZ.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-base-content/50"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-9" />;
                  }

                  const inRange = isInRange(date);
                  const isStart = isStartDate(date);
                  const isEnd = isEndDate(date);
                  const isTodayDate = isToday(date);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      className={clsx(
                        'relative h-9 rounded-lg text-sm font-medium transition-all',
                        inRange && !isStart && !isEnd && 'bg-primary/20',
                        (isStart || isEnd) && 'bg-primary text-primary-content',
                        !inRange && !isStart && !isEnd && 'hover:bg-base-200',
                        isTodayDate && !isStart && !isEnd && 'ring-2 ring-primary/30'
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Quick Select */}
              <div className="mt-4 flex flex-wrap gap-1">
                {['today', 'week', 'month'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      handlePresetSelect(preset as DateRangePreset);
                    }}
                    className="rounded-lg bg-base-200 px-2 py-1 text-xs font-medium transition-colors hover:bg-base-300"
                  >
                    {PRESET_OPTIONS.find((o) => o.value === preset)?.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowCalendar(false);
                    setTempStart(customRange.start);
                    setTempEnd(customRange.end);
                  }}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  <X className="h-4 w-4" />
                  Bekor
                </button>
                <button
                  onClick={handleApplyCustomRange}
                  disabled={!tempStart || !tempEnd}
                  className="btn btn-primary btn-sm flex-1"
                >
                  <Check className="h-4 w-4" />
                  Qo'llash
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
