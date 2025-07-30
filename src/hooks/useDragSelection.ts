import { useState, useCallback, useRef } from 'react';
import { isBefore, isAfter, isSameDay } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DragSelectionState {
  isDragging: boolean;
  dragStart: Date | null;
  dragEnd: Date | null;
  selectedRanges: DateRange[];
}

export const useDragSelection = (
  onRangeSelect?: (ranges: DateRange[]) => void,
  maxRanges: number = 5
) => {
  const [dragState, setDragState] = useState<DragSelectionState>({
    isDragging: false,
    dragStart: null,
    dragEnd: null,
    selectedRanges: [],
  });

  const dragStartRef = useRef<Date | null>(null);

  const startDrag = useCallback((date: Date) => {
    dragStartRef.current = date;
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: date,
      dragEnd: date,
    }));
  }, []);

  const updateDrag = useCallback((date: Date) => {
    if (!dragState.isDragging || !dragStartRef.current) return;

    setDragState(prev => ({
      ...prev,
      dragEnd: date,
    }));
  }, [dragState.isDragging]);

  const endDrag = useCallback(() => {
    if (!dragState.isDragging || !dragState.dragStart || !dragState.dragEnd) {
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        dragStart: null,
        dragEnd: null,
      }));
      return;
    }

    const start = isBefore(dragState.dragStart, dragState.dragEnd) ? dragState.dragStart : dragState.dragEnd;
    const end = isAfter(dragState.dragStart, dragState.dragEnd) ? dragState.dragStart : dragState.dragEnd;

    const newRange: DateRange = { start, end };

    // Check if we've reached the maximum number of ranges
    if (dragState.selectedRanges.length >= maxRanges) {
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        dragStart: null,
        dragEnd: null,
      }));
      return;
    }

    // Add the new range
    const newRanges = [...dragState.selectedRanges, newRange];

    setDragState(prev => ({
      ...prev,
      isDragging: false,
      dragStart: null,
      dragEnd: null,
      selectedRanges: newRanges,
    }));

    onRangeSelect?.(newRanges);
  }, [dragState, onRangeSelect, maxRanges]);

  const removeRange = useCallback((index: number) => {
    const newRanges = dragState.selectedRanges.filter((_, i) => i !== index);
    setDragState(prev => ({
      ...prev,
      selectedRanges: newRanges,
    }));
    onRangeSelect?.(newRanges);
  }, [dragState.selectedRanges, onRangeSelect]);

  const clearSelection = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      selectedRanges: [],
    }));
    onRangeSelect?.([]);
  }, [onRangeSelect]);

  const isDateInCurrentDrag = useCallback((date: Date): boolean => {
    if (!dragState.isDragging || !dragState.dragStart || !dragState.dragEnd) return false;

    const start = isBefore(dragState.dragStart, dragState.dragEnd) ? dragState.dragStart : dragState.dragEnd;
    const end = isAfter(dragState.dragStart, dragState.dragEnd) ? dragState.dragStart : dragState.dragEnd;

    return (date >= start && date <= end) || isSameDay(date, start) || isSameDay(date, end);
  }, [dragState]);

  const isDateInSelectedRanges = useCallback((date: Date): boolean => {
    return dragState.selectedRanges.some(range => 
      (date >= range.start && date <= range.end) || 
      isSameDay(date, range.start) || 
      isSameDay(date, range.end)
    );
  }, [dragState.selectedRanges]);

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    removeRange,
    clearSelection,
    isDateInCurrentDrag,
    isDateInSelectedRanges,
  };
};