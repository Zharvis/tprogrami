import { test, expect } from '@playwright/test';
import { computeLayout } from '../lib/layout-engine';

test.describe('LayoutEngine', () => {
  test('positions a single activity in grid view correctly', () => {
    const activities = [
      { 
        id: '1', 
        title: 'Math', 
        date: '2026-06-08', 
        dayOfWeek: 1, 
        startTime: '09:00', 
        endTime: '10:00' 
      }
    ];

    const result = computeLayout(activities, { 
      viewType: 'grid',
      startHour: 8,
      endHour: 18
    });

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    
    // 8:00 to 18:00 = 600 mins
    // 9:00 is 60 mins from start (10%)
    // 1 hour duration is 10%
    expect(item.style.top).toBe('10%');
    expect(item.style.height).toBe('10%');
    expect(item.style.left).toBe('0%');
    expect(item.style.width).toBe('100%');
    
    expect(item.layout.top).toBe(10);
    expect(item.layout.height).toBe(10);
    expect(item.layout.left).toBe(0);
    expect(item.layout.width).toBe(100);
    expect(item.activity.title).toBe('Math');
  });

  test('handles overlapping activities in grid view by splitting columns', () => {
    const activities = [
      { id: '1', title: 'A1', date: '2026-06-08', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { id: '2', title: 'A2', date: '2026-06-08', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
    ];

    const result = computeLayout(activities, { 
      viewType: 'grid',
      startHour: 8,
      endHour: 18
    });

    expect(result.items).toHaveLength(2);
    
    const item1 = result.items.find(i => i.activity.id === '1')!;
    const item2 = result.items.find(i => i.activity.id === '2')!;

    // Both should be 50% width
    expect(item1.style.width).toBe('50%');
    expect(item2.style.width).toBe('50%');
    expect(item1.layout.width).toBe(50);
    expect(item2.layout.width).toBe(50);

    // item1 is column 0 (0%), item2 is column 1 (50%)
    expect(item1.style.left).toBe('0%');
    expect(item2.style.left).toBe('50%');
    expect(item1.layout.left).toBe(0);
    expect(item2.layout.left).toBe(50);
  });

  test('groups activities by date in agenda view without complex styles', () => {
    const activities = [
      { id: '1', title: 'A1', date: '2026-06-08', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { id: '2', title: 'A2', date: '2026-06-09', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }
    ];

    const result = computeLayout(activities, { 
      viewType: 'agenda'
    });

    expect(result.groupedByDate['2026-06-08']).toHaveLength(1);
    expect(result.groupedByDate['2026-06-09']).toHaveLength(1);
    
    const item1 = result.groupedByDate['2026-06-08'][0];
    // Agenda view shouldn't have top/height percentages that matter for layout
    // but for now, we'll see if the implementation simplifies styles for agenda
    expect(item1.activity.title).toBe('A1');
  });

  test('identifies happeningNow and nextUp correctly', () => {
    const activities = [
      { id: '1', title: 'Current', date: '2026-06-08', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { id: '2', title: 'Next', date: '2026-06-08', dayOfWeek: 1, startTime: '10:30', endTime: '11:30' }
    ];

    // Simulate "now" being 09:30 UTC
    const now = new Date('2026-06-08T09:30:00Z');

    const result = computeLayout(activities, { 
      viewType: 'agenda',
      now
    });

    expect(result.happeningNow?.activity.title).toBe('Current');
    expect(result.nextUp?.activity.title).toBe('Next');
    
    expect(result.happeningNow?.metadata.isHappeningNow).toBe(true);
    expect(result.nextUp?.metadata.isNextUp).toBe(true);
  });
});
