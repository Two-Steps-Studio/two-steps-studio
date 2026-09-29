// Cubic-bezier easing: evaluation plus copy-paste snippets for engines that
// don't take a cubic-bezier() directly (Unity, Godot). The snippets use the
// same Newton iteration as cubicBezier() below, which the tests pin down.

export type Bezier = [number, number, number, number];

// One axis of a cubic Bezier from (0,0) to (1,1) with control points p1, p2:
// B(u) = a·u³ + b·u² + c·u
const coeffs = (p1: number, p2: number) => ({ a: 1 - 3 * p2 + 3 * p1, b: 3 * p2 - 6 * p1, c: 3 * p1 });

export function cubicBezier([x1, y1, x2, y2]: Bezier) {
  const x = coeffs(x1, x2);
  const y = coeffs(y1, y2);
  const at = (k: typeof x, u: number) => ((k.a * u + k.b) * u + k.c) * u;
  const slope = (k: typeof x, u: number) => (3 * k.a * u + 2 * k.b) * u + k.c;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = at(x, u) - t;
      const d = slope(x, u);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      u = Math.min(1, Math.max(0, u - err / d));
    }
    return at(y, u);
  };
}

export const EASING_PRESETS: { name: string; value: Bezier }[] = [
  { name: "linear", value: [0, 0, 1, 1] },
  { name: "ease", value: [0.25, 0.1, 0.25, 1] },
  { name: "ease-in", value: [0.42, 0, 1, 1] },
  { name: "ease-out", value: [0, 0, 0.58, 1] },
  { name: "ease-in-out", value: [0.42, 0, 0.58, 1] },
  // The site's own --transition-timing (globals.css).
  { name: "TSS", value: [0.16, 1, 0.3, 1] },
  { name: "in-back", value: [0.36, 0, 0.66, -0.56] },
  { name: "out-back", value: [0.34, 1.56, 0.64, 1] },
  { name: "in-out-cubic", value: [0.65, 0, 0.35, 1] },
];

const num = (v: number) => String(Math.round(v * 1000) / 1000);
const f = (v: number) => `${num(v)}f`;
const gd = (v: number) => (Number.isInteger(v) ? `${v}.0` : num(v));

export const toCss = ([x1, y1, x2, y2]: Bezier) => `cubic-bezier(${num(x1)}, ${num(y1)}, ${num(x2)}, ${num(y2)})`;
export const toMotion = ([x1, y1, x2, y2]: Bezier) => `ease: [${num(x1)}, ${num(y1)}, ${num(x2)}, ${num(y2)}]`;

export function toUnity([x1, y1, x2, y2]: Bezier) {
  return `// ${toCss([x1, y1, x2, y2])} - t in [0, 1] -> eased value
public static float Ease(float t)
{
    const float x1 = ${f(x1)}, y1 = ${f(y1)}, x2 = ${f(x2)}, y2 = ${f(y2)};
    float u = t;
    for (int i = 0; i < 8; i++)
    {
        float err = Bezier(u, x1, x2) - t;
        float d = Slope(u, x1, x2);
        if (Mathf.Abs(err) < 1e-5f || Mathf.Abs(d) < 1e-6f) break;
        u = Mathf.Clamp01(u - err / d);
    }
    return Bezier(u, y1, y2);
}

static float Bezier(float u, float p1, float p2) => (((1 - 3 * p2 + 3 * p1) * u + (3 * p2 - 6 * p1)) * u + 3 * p1) * u;
static float Slope(float u, float p1, float p2) => (3 * (1 - 3 * p2 + 3 * p1) * u + 2 * (3 * p2 - 6 * p1)) * u + 3 * p1;`;
}

export function toGodot([x1, y1, x2, y2]: Bezier) {
  return `# ${toCss([x1, y1, x2, y2])} - t in [0, 1] -> eased value
func ease_curve(t: float) -> float:
	const X1 := ${gd(x1)}
	const Y1 := ${gd(y1)}
	const X2 := ${gd(x2)}
	const Y2 := ${gd(y2)}
	var u := t
	for i in 8:
		var err := _bezier(u, X1, X2) - t
		var d := _slope(u, X1, X2)
		if absf(err) < 1e-5 or absf(d) < 1e-6:
			break
		u = clampf(u - err / d, 0.0, 1.0)
	return _bezier(u, Y1, Y2)


func _bezier(u: float, p1: float, p2: float) -> float:
	return (((1.0 - 3.0 * p2 + 3.0 * p1) * u + (3.0 * p2 - 6.0 * p1)) * u + 3.0 * p1) * u


func _slope(u: float, p1: float, p2: float) -> float:
	return (3.0 * (1.0 - 3.0 * p2 + 3.0 * p1) * u + 2.0 * (3.0 * p2 - 6.0 * p1)) * u + 3.0 * p1`;
}
