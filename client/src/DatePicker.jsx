import React, { useState, useRef, useEffect } from 'react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function DatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // value is expected to be "YYYY-MM-DD" in local time
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  
  // Track the month currently being viewed in the calendar
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [slideDirection, setSlideDirection] = useState('right');

  // Touch states for swipe gesture
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 40;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNextMonth();
    } else if (isRightSwipe) {
      handlePrevMonth();
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = () => {
    setSlideDirection('left');
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSlideDirection('right');
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    // Generate YYYY-MM-DD
    const newDate = new Date(year, month, day);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null); // empty slots for the first row
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Determine selected day to highlight
  // Parsing value reliably by appending T00:00:00 to avoid timezone shift
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const selectedYear = selectedDate?.getFullYear();
  const selectedMonth = selectedDate?.getMonth();
  const selectedDay = selectedDate?.getDate();

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const displayDate = selectedDate 
    ? `${String(selectedDay).padStart(2, '0')}-${String(selectedMonth + 1).padStart(2, '0')}-${selectedYear}` 
    : "Select Date";

  return (
    <div className="date-picker-container" ref={containerRef} style={{ position: 'relative' }}>
      <button 
        type="button" 
        className="form-input" 
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{displayDate}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--muted)' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="custom-calendar popup"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="calendar-header">
            <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className="calendar-month-year">
              {MONTH_NAMES[month]} {year}
            </div>
            <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>

          <div className={`calendar-body slide-in-${slideDirection}`} key={currentMonth.toISOString()}>
            <div className="calendar-weekdays">
              {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="calendar-grid">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="calendar-day empty"></div>;
              
              const isSelected = selectedYear === year && selectedMonth === month && selectedDay === day;
              const isToday = todayYear === year && todayMonth === month && todayDay === day;

              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
                  onClick={() => handleDateClick(day)}
                >
                  <span className="day-text">{day}</span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
