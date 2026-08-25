"use client";

import { useRef, useState } from "react";

// Shared playback state/handlers for a single <audio> element, used by the
// Music and Podcast detail pages (previously duplicated near-verbatim in both).
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100;
      setVolume(value[0]);
    }
  };

  // Detail pages show a single track/episode with no playlist/queue, so
  // "skip" is a ±10s seek rather than a real prev/next-track jump.
  const handleSkip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = audio.duration || Infinity;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, duration));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    volume,
    handlePlayPause,
    handleTimeUpdate,
    handleSeek,
    handleVolumeChange,
    handleSkip,
    formatTime,
  };
}
