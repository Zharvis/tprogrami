import React from 'react';

export type ViewType = 'grid' | 'agenda';

export interface LayoutEngineOptions {
  viewType: ViewType;
  startHour?: number; // Default: 8
  endHour?: number;   // Default: 18
  now?: Date;         // For identifying 'happening' and 'next'
}

export interface PositionedActivity<T> {
  activity: T;
  style: React.CSSProperties;
  layout: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  metadata: {
    isHappeningNow: boolean;
    isNextUp: boolean;
  };
}

export interface LayoutResult<T> {
  items: PositionedActivity<T>[];
  happeningNow?: PositionedActivity<T>;
  nextUp?: PositionedActivity<T>;
  groupedByDate: Record<string, PositionedActivity<T>[]>;
}

export function computeLayout<T extends { startTime: string; endTime: string; dayOfWeek: number; date: string }>(
  activities: T[],
  options: LayoutEngineOptions
): LayoutResult<T> {
  const startHour = options.startHour ?? 8;
  const endHour = options.endHour ?? 18;
  const gridStartMin = startHour * 60;
  const gridTotalMin = (endHour - startHour) * 60;

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const positionedItems: PositionedActivity<T>[] = [];

  // 1. Group by date to handle overlaps locally per day
  const byDate: Record<string, T[]> = {};
  for (const act of activities) {
    if (!byDate[act.date]) byDate[act.date] = [];
    byDate[act.date].push(act);
  }

  for (const date of Object.keys(byDate)) {
    const dayActivities = byDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const clusters: T[][] = [];

    // Simple clustering algorithm
    for (const act of dayActivities) {
      let added = false;
      const actStart = timeToMinutes(act.startTime);
      const actEnd = timeToMinutes(act.endTime);

      for (const cluster of clusters) {
        const overlaps = cluster.some((c) => {
          const cStart = timeToMinutes(c.startTime);
          const cEnd = timeToMinutes(c.endTime);
          return actStart < cEnd && actEnd > cStart;
        });

        if (overlaps) {
          cluster.push(act);
          added = true;
          break;
        }
      }

      if (!added) {
        clusters.push([act]);
      }
    }

    // Position within each cluster
    for (const cluster of clusters) {
      const columns: T[][] = [];
      for (const act of cluster) {
        const actStart = timeToMinutes(act.startTime);
        let colIndex = 0;
        while (true) {
          if (!columns[colIndex]) columns[colIndex] = [];
          const lastInCol = columns[colIndex][columns[colIndex].length - 1];
          if (!lastInCol || actStart >= timeToMinutes(lastInCol.endTime)) {
            columns[colIndex].push(act);
            break;
          }
          colIndex++;
        }
      }

      const colCount = columns.length;
      for (let i = 0; i < colCount; i++) {
        for (const act of columns[i]) {
          const actStart = timeToMinutes(act.startTime);
          const actEnd = timeToMinutes(act.endTime);

          const startMin = Math.max(gridStartMin, actStart);
          const endMin = Math.min(gridStartMin + gridTotalMin, actEnd);

          const top = ((startMin - gridStartMin) / gridTotalMin) * 100;
          const height = ((endMin - startMin) / gridTotalMin) * 100;
          const left = (i / colCount) * 100;
          const width = 100 / colCount;

          positionedItems.push({
            activity: act,
            style: {
              top: `${top}%`,
              height: `${height}%`,
              left: `${left}%`,
              width: `${width}%`,
            },
            layout: {
              top,
              left,
              width,
              height,
            },
            metadata: {
              isHappeningNow: false,
              isNextUp: false,
            },
          });
        }
      }
    }
  }

  // 2. Identify happeningNow and nextUp if 'now' is provided
  let happeningNow: PositionedActivity<T> | undefined;
  let nextUp: PositionedActivity<T> | undefined;

  if (options.now) {
    const now = options.now;
    const nowDateStr = now.toISOString().split('T')[0];
    const nowTimeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

    // Filter and sort for finding nextUp
    const sorted = [...positionedItems].sort((a, b) => {
      if (a.activity.date !== b.activity.date) {
        return a.activity.date.localeCompare(b.activity.date);
      }
      return a.activity.startTime.localeCompare(b.activity.startTime);
    });

    for (const item of sorted) {
      const act = item.activity;
      if (act.date === nowDateStr) {
        if (act.startTime <= nowTimeStr && act.endTime >= nowTimeStr) {
          item.metadata.isHappeningNow = true;
          happeningNow = item;
        } else if (act.startTime > nowTimeStr) {
          if (!nextUp || (act.date < nextUp.activity.date || (act.date === nextUp.activity.date && act.startTime < nextUp.activity.startTime))) {
            nextUp = item;
          }
        }
      } else if (act.date > nowDateStr) {
        if (!nextUp || act.date < nextUp.activity.date || (act.date === nextUp.activity.date && act.startTime < nextUp.activity.startTime)) {
          nextUp = item;
        }
      }
    }

    if (nextUp) {
      nextUp.metadata.isNextUp = true;
    }
  }

  const groupedByDate: Record<string, PositionedActivity<T>[]> = {};
  for (const item of positionedItems) {
    const date = item.activity.date;
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(item);
  }

  return {
    items: positionedItems,
    happeningNow,
    nextUp,
    groupedByDate,
  };
}
