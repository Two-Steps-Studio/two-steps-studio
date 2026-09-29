"use client";

import { useEffect, useRef, useState } from "react";
import { Dices, Flag, Pause, Play, RotateCcw, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { createAudioContext, playTone } from "./audio";
import { EsportTools } from "./EsportTools";
import { randomInt, shuffle } from "./random";
import { CopyButton, Segmented, ToolCard, monoField } from "./shared";

const actionButton = "rounded-xl border-[var(--border-color)]";
const resultBox = "rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4";

/* ------------------------------------ Dice -------------------------------------- */

const DICE = ["4", "6", "8", "10", "12", "20", "100"] as const;
type Die = (typeof DICE)[number];

function DiceTool() {
  const { t } = useLanguage();
  const [sides, setSides] = useState<Die>("6");
  const [count, setCount] = useState(2);
  const [rolls, setRolls] = useState<number[]>([]);
  const [coin, setCoin] = useState<"heads" | "tails" | null>(null);
  // Bumped on every roll so the result re-mounts and replays its pop-in even
  // when the numbers happen to come out identical.
  const [rollId, setRollId] = useState(0);

  const roll = () => {
    setRolls(Array.from({ length: count }, () => randomInt(Number(sides)) + 1));
    setCoin(null);
    setRollId((n) => n + 1);
  };
  const flip = () => {
    setCoin(randomInt(2) === 0 ? "heads" : "tails");
    setRolls([]);
    setRollId((n) => n + 1);
  };

  return (
    <ToolCard title={t.devTools.diceTitle} description={t.devTools.diceDesc}>
      <Segmented options={DICE.map((d) => ({ value: d, label: `d${d}` }))} value={sides} onChange={setSides} label={t.devTools.diceSides} />
      <div className="space-y-2">
        <Label>{t.devTools.diceCount}: {count}</Label>
        <Slider value={[count]} onValueChange={([v]) => setCount(v)} min={1} max={10} step={1} aria-label={t.devTools.diceCount} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={roll}>
          <Dices /> {t.devTools.diceRoll} {count}d{sides}
        </Button>
        <Button type="button" variant="outline" className={actionButton} onClick={flip}>
          {t.devTools.coinFlip}
        </Button>
      </div>
      <div aria-live="polite">
        {rolls.length > 0 && (
          <div key={`d${rollId}`} className={cn(resultBox, "animate-in fade-in-0 zoom-in-95 duration-200")}>
            <div className="flex flex-wrap gap-2">
              {rolls.map((r, i) => (
                <span key={i} className="grid size-11 place-items-center rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] font-mono text-lg font-bold text-[var(--text)]">
                  {r}
                </span>
              ))}
            </div>
            {rolls.length > 1 && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {t.devTools.diceTotal}: <span className="font-mono text-lg font-bold text-[var(--text)]">{rolls.reduce((a, b) => a + b, 0)}</span>
              </p>
            )}
          </div>
        )}
        {coin && (
          <p key={`c${rollId}`} className="mt-3 animate-in fade-in-0 zoom-in-95 text-center text-2xl font-bold text-[var(--text)] duration-200">
            {coin === "heads" ? t.devTools.coinHeads : t.devTools.coinTails}
          </p>
        )}
      </div>
    </ToolCard>
  );
}

/* ------------------------------- Picker & teams --------------------------------- */

function PickerTool() {
  const { t } = useLanguage();
  const [names, setNames] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [winner, setWinner] = useState<string | null>(null);
  const [teams, setTeams] = useState<string[][]>([]);
  const [drawId, setDrawId] = useState(0);

  const list = names.split("\n").map((n) => n.trim()).filter(Boolean);

  const pick = () => {
    setTeams([]);
    setWinner(list[randomInt(list.length)]);
    setDrawId((n) => n + 1);
  };
  // Shuffle once, then deal round-robin so team sizes differ by at most 1.
  const split = () => {
    const dealt: string[][] = Array.from({ length: teamCount }, () => []);
    shuffle(list).forEach((name, i) => dealt[i % teamCount].push(name));
    setWinner(null);
    setTeams(dealt);
    setDrawId((n) => n + 1);
  };

  const teamsText = teams.map((team, i) => `${t.devTools.pickerTeam} ${i + 1}: ${team.join(", ")}`).join("\n");

  return (
    <ToolCard title={t.devTools.pickerTitle} description={t.devTools.pickerDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-picker">{t.devTools.pickerNames} ({list.length})</Label>
        <Textarea id="dt-picker" value={names} onChange={(e) => setNames(e.target.value)} rows={5} placeholder={"Ania\nBartek\nCyryl\nDaria"} />
      </div>
      <div className="space-y-2">
        <Label>{t.devTools.pickerTeams}: {teamCount}</Label>
        <Slider value={[teamCount]} onValueChange={([v]) => setTeamCount(v)} min={2} max={8} step={1} aria-label={t.devTools.pickerTeams} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={pick} disabled={list.length < 2}>
          <Trophy /> {t.devTools.pickerPick}
        </Button>
        <Button type="button" variant="outline" className={actionButton} onClick={split} disabled={list.length < teamCount}>
          <Users /> {t.devTools.pickerSplit}
        </Button>
      </div>
      <div aria-live="polite">
        {winner && (
          <div key={drawId} className={cn(resultBox, "animate-in fade-in-0 zoom-in-95 text-center duration-200")}>
            <p className="text-xs text-[var(--text-muted)]">{t.devTools.pickerWinner}</p>
            <p className="text-3xl font-bold text-[var(--text)]">{winner}</p>
          </div>
        )}
        {teams.length > 0 && (
          <div key={drawId} className="animate-in fade-in-0 space-y-3 duration-200">
            <div className="grid gap-2 sm:grid-cols-2">
              {teams.map((team, i) => (
                <div key={i} className={resultBox}>
                  <p className="mb-1 text-xs font-bold text-[var(--text-muted)]">{t.devTools.pickerTeam} {i + 1}</p>
                  <p className="text-sm text-[var(--text)]">{team.join(", ")}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <CopyButton value={teamsText} />
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
}

/* ------------------------------------ Timer ------------------------------------- */

function formatDuration(ms: number) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h ? `${h}:` : ""}${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function beep() {
  try {
    const ctx = createAudioContext();
    [0, 0.25, 0.5].forEach((at) => playTone(ctx, 880, ctx.currentTime + at, 0.2, 0.15));
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // No audio (autoplay policy, no device) - the toast still shows.
  }
}

type TimerMode = "stopwatch" | "countdown";

function TimerTool() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [running, setRunning] = useState(false);
  // Elapsed time is derived from timestamps rather than counted per tick, so
  // a throttled background tab still shows the right time when you return.
  const [accumulated, setAccumulated] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const firedRef = useRef(false);

  const duration = (Number(minutes) || 0) * 60000 + (Number(seconds) || 0) * 1000;
  const elapsed = accumulated + (running ? now - startedAt : 0);
  const shown = mode === "countdown" ? duration - elapsed : elapsed;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (mode === "countdown" && accumulated + current - startedAt >= duration && !firedRef.current) {
        firedRef.current = true;
        setRunning(false);
        setAccumulated(duration);
        beep();
        toast.success(t.devTools.timerDone);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, mode, accumulated, startedAt, duration, t]);

  const start = () => {
    const current = Date.now();
    firedRef.current = false;
    setStartedAt(current);
    setNow(current);
    setRunning(true);
  };
  const pause = () => {
    setAccumulated(elapsed);
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setAccumulated(0);
    setLaps([]);
  };
  const switchMode = (m: TimerMode) => {
    reset();
    setMode(m);
  };

  const finished = mode === "countdown" && !running && accumulated >= duration && duration > 0;

  return (
    <ToolCard title={t.devTools.timerTitle} description={t.devTools.timerDesc}>
      <Segmented
        options={[
          { value: "stopwatch", label: t.devTools.timerStopwatch },
          { value: "countdown", label: t.devTools.timerCountdown },
        ]}
        value={mode}
        onChange={switchMode}
        label={t.devTools.timerTitle}
      />
      {mode === "countdown" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-timer-min">{t.devTools.timerMinutes}</Label>
            <Input id="dt-timer-min" type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} disabled={running || accumulated > 0} className={monoField} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-timer-sec">{t.devTools.timerSeconds}</Label>
            <Input id="dt-timer-sec" type="number" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} disabled={running || accumulated > 0} className={monoField} />
          </div>
        </div>
      )}
      <p
        role="timer"
        className={cn(
          "text-center font-mono text-5xl font-bold tabular-nums text-[var(--text)] sm:text-6xl",
          finished && "text-red-600 dark:text-red-400"
        )}
      >
        {formatDuration(shown)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {running ? (
          <Button type="button" variant="outline" className={actionButton} onClick={pause}>
            <Pause /> {t.devTools.timerPause}
          </Button>
        ) : (
          <Button type="button" variant="outline" className={actionButton} onClick={start} disabled={finished || (mode === "countdown" && duration <= 0)}>
            <Play /> {accumulated > 0 ? t.devTools.timerResume : t.devTools.timerStart}
          </Button>
        )}
        {mode === "stopwatch" && (
          <Button type="button" variant="outline" className={actionButton} onClick={() => setLaps([elapsed, ...laps])} disabled={!running}>
            <Flag /> {t.devTools.timerLap}
          </Button>
        )}
        <Button type="button" variant="outline" className={actionButton} onClick={reset} disabled={!running && accumulated === 0}>
          <RotateCcw /> {t.devTools.timerReset}
        </Button>
      </div>
      {laps.length > 0 && (
        <ol className="max-h-40 divide-y divide-[var(--border-color)] overflow-y-auto rounded-2xl border border-[var(--border-color)]">
          {laps.map((lap, i) => (
            <li key={laps.length - i} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-[var(--text-muted)]">#{laps.length - i}</span>
              <span className="font-mono tabular-nums text-[var(--text)]">{formatDuration(lap)}</span>
            </li>
          ))}
        </ol>
      )}
    </ToolCard>
  );
}

export function GameTools() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DiceTool />
      <PickerTool />
      <TimerTool />
      <EsportTools />
    </div>
  );
}
