export function layoutActivities<T extends { dayOfWeek: number; startTime: string; endTime: string }>(
  activities: T[],
  startHour: number = 8,
  endHour: number = 18
): (T & { top: number; height: number; left: number; width: number })[] {
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const gridStartMin = startHour * 60;
  const gridEndMin = endHour * 60;
  const gridTotalMin = gridEndMin - gridStartMin;

  // Group by dayOfWeek
  const days: { [day: number]: T[][] } = {};
  for (let d = 1; d <= 7; d++) days[d] = [];

  // Sort activities by dayOfWeek and startTime
  const sorted = [...activities].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  for (const act of sorted) {
    const dayClusters = days[act.dayOfWeek];
    if (!dayClusters) continue;
    const actStart = timeToMinutes(act.startTime);
    const actEnd = timeToMinutes(act.endTime);

    let added = false;
    for (const cluster of dayClusters) {
      const overlaps = cluster.some((cAct) => {
        const cStart = timeToMinutes(cAct.startTime);
        const cEnd = timeToMinutes(cAct.endTime);
        return actStart < cEnd && actEnd > cStart;
      });

      if (overlaps) {
        cluster.push(act);
        added = true;
        break;
      }
    }

    if (!added) {
      dayClusters.push([act]);
    }
  }

  const positioned: (T & { top: number; height: number; left: number; width: number })[] = [];

  for (let d = 1; d <= 7; d++) {
    const clusters = days[d] || [];
    for (const cluster of clusters) {
      cluster.sort((a, b) => a.startTime.localeCompare(b.startTime));

      const columns: T[][] = [];
      for (const act of cluster) {
        const actStart = timeToMinutes(act.startTime);

        let colIndex = 0;
        while (true) {
          if (!columns[colIndex]) {
            columns[colIndex] = [];
          }
          const lastInCol = columns[colIndex][columns[colIndex].length - 1];
          if (!lastInCol) {
            columns[colIndex].push(act);
            break;
          }
          const lastEnd = timeToMinutes(lastInCol.endTime);
          if (actStart >= lastEnd) {
            columns[colIndex].push(act);
            break;
          }
          colIndex++;
        }
      }

      const columnsCount = columns.length;
      for (let colIndex = 0; colIndex < columnsCount; colIndex++) {
        for (const act of columns[colIndex]) {
          const actStart = timeToMinutes(act.startTime);
          const actEnd = timeToMinutes(act.endTime);

          const startMin = Math.max(gridStartMin, actStart);
          const endMin = Math.min(gridEndMin, actEnd);

          const topPercent = ((startMin - gridStartMin) / gridTotalMin) * 100;
          const heightPercent = ((endMin - startMin) / gridTotalMin) * 100;

          const leftPercent = (colIndex / columnsCount) * 100;
          const widthPercent = 100 / columnsCount;

          positioned.push({
            ...act,
            top: topPercent,
            height: heightPercent,
            left: leftPercent,
            width: widthPercent,
          });
        }
      }
    }
  }

  return positioned;
}
