import { test, expect } from '@playwright/test';
import { layoutActivities } from '../lib/layout';

test.describe('Calendar Layout Algorithm (Pure Math)', () => {
  test('positions a single activity correctly within the default 8:00 to 18:00 grid', () => {
    const activities = [
      { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }
    ];

    const positioned = layoutActivities(activities);

    expect(positioned).toHaveLength(1);
    const act = positioned[0];
    
    // 8:00 to 18:00 = 10 hours = 600 minutes
    // 9:00 to 10:00 = 60 minutes
    // 9:00 is 1 hour (60 mins) from 8:00. 60 / 600 = 10%
    expect(act.top).toBeCloseTo(10);
    // 1 hour duration. 60 / 600 = 10%
    expect(act.height).toBeCloseTo(10);
    
    // Only 1 column
    expect(act.left).toBeCloseTo(0);
    expect(act.width).toBeCloseTo(100);
  });

  test('handles two overlapping activities by splitting them into two columns', () => {
    const activities = [
      { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { id: '2', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
    ];

    const positioned = layoutActivities(activities);

    expect(positioned).toHaveLength(2);
    
    const act1 = positioned.find(a => a.id === '1')!;
    const act2 = positioned.find(a => a.id === '2')!;

    // Both should be 50% width
    expect(act1.width).toBeCloseTo(50);
    expect(act2.width).toBeCloseTo(50);

    // act1 is column 0, act2 is column 1
    expect(act1.left).toBeCloseTo(0);
    expect(act2.left).toBeCloseTo(50);
  });

  test('handles three overlapping activities', () => {
    const activities = [
      { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { id: '2', dayOfWeek: 1, startTime: '09:30', endTime: '10:00' },
      { id: '3', dayOfWeek: 1, startTime: '09:45', endTime: '11:00' }
    ];

    const positioned = layoutActivities(activities);

    expect(positioned).toHaveLength(3);
    
    const widths = positioned.map(a => a.width);
    // 3 overlapping activities = 3 columns = ~33.33% each
    for (const w of widths) {
      expect(w).toBeCloseTo(33.33, 1);
    }

    const lefts = positioned.map(a => a.left).sort((a, b) => a - b);
    expect(lefts[0]).toBeCloseTo(0, 1);
    expect(lefts[1]).toBeCloseTo(33.33, 1);
    expect(lefts[2]).toBeCloseTo(66.66, 1);
  });

  test('does not overlap activities on different days', () => {
    const activities = [
      { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }, // Monday
      { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '10:30' }  // Tuesday
    ];

    const positioned = layoutActivities(activities);

    expect(positioned).toHaveLength(2);
    
    // They should both be full width since they are on different days
    expect(positioned[0].width).toBeCloseTo(100);
    expect(positioned[1].width).toBeCloseTo(100);
    expect(positioned[0].left).toBeCloseTo(0);
    expect(positioned[1].left).toBeCloseTo(0);
  });
});
