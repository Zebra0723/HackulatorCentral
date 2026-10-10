export type Dir = "up" | "down" | "left" | "right";
export interface Point {
  x: number;
  y: number;
}
export interface SnakeState {
  size: number;
  snake: Point[];
  dir: Dir;
  queued: Dir[];
  food: Point;
  score: number;
  over: boolean;
}

const VEC: Record<Dir, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export function placeFood(size: number, snake: Point[], rand: () => number): Point {
  const free: Point[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  return free[Math.floor(rand() * free.length)] ?? { x: -1, y: -1 };
}

export function newGame(size = 15, rand: () => number = Math.random): SnakeState {
  const mid = Math.floor(size / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return { size, snake, dir: "right", queued: [], food: placeFood(size, snake, rand), score: 0, over: false };
}

/** Queue a turn; ignores reversals and repeats so quick key presses aren't lost. */
export function turn(s: SnakeState, d: Dir): SnakeState {
  const last = s.queued[s.queued.length - 1] ?? s.dir;
  if (d === last || d === OPPOSITE[last] || s.queued.length >= 2) return s;
  return { ...s, queued: [...s.queued, d] };
}

export function step(s: SnakeState, rand: () => number = Math.random): SnakeState {
  if (s.over) return s;
  const [next, ...rest] = s.queued;
  const dir = next ?? s.dir;
  const head = { x: s.snake[0].x + VEC[dir].x, y: s.snake[0].y + VEC[dir].y };
  const eats = head.x === s.food.x && head.y === s.food.y;
  const body = eats ? s.snake : s.snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= s.size || head.y >= s.size;
  const hitSelf = body.some((p) => p.x === head.x && p.y === head.y);
  if (hitWall || hitSelf) return { ...s, dir, queued: rest, over: true };
  const snake = [head, ...body];
  return {
    ...s,
    dir,
    queued: rest,
    snake,
    food: eats ? placeFood(s.size, snake, rand) : s.food,
    score: eats ? s.score + 1 : s.score,
  };
}
