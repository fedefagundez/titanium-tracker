const GATE_JUMP_TIME = 5;

const SHIP_WARP_SPEEDS = {
  601: 5.0, 10190: 8.0, 10192: 5.0,
  589: 8.0, 10188: 8.0,
  582: 5.0, 584: 5.0, 586: 5.0, 587: 5.0, 593: 5.0, 594: 5.0,
  598: 5.0, 599: 5.0, 603: 5.0, 605: 5.0,
  620: 3.0, 621: 3.0, 622: 3.0, 623: 3.0, 624: 3.0, 625: 3.0,
  638: 2.0, 639: 2.0, 640: 2.0, 641: 2.0, 642: 2.0,
};

export function getWarpSpeedByTypeId(typeId) {
  return SHIP_WARP_SPEEDS[typeId] || 3.0;
}

export function formatTime(seconds) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export { GATE_JUMP_TIME };
