"use client";

/* eslint-disable @next/next/no-img-element -- poster must render before any JS/media; intrinsic 4:5 size is fixed */

import { useCallback, useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, ReplayIcon, SoundOffIcon, SoundOnIcon } from "./icons";

type Status = "unavailable" | "idle" | "playing" | "paused" | "ended" | "error";

interface Props {
  src?: string;
  poster: string;
  posterFallback: string;
}

function prefersReducedData(): boolean {
  if (typeof window === "undefined") return true;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return reducedMotion || Boolean(conn?.saveData);
}

/**
 * 4:5 concept film stage. Poster first; the video element (and its data) is
 * only created once the stage is on screen and inline autoplay is
 * appropriate, or when the visitor presses play. Always muted until the
 * visitor turns sound on. Pauses when scrolled away.
 */
export function FilmStage({ src, poster, posterFallback }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const wantPlay = useRef(false);
  const [activated, setActivated] = useState(false);
  const [status, setStatus] = useState<Status>(src ? "idle" : "unavailable");
  const [muted, setMuted] = useState(true);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) {
      wantPlay.current = true;
      setActivated(true);
      return;
    }
    v.play().catch(() => setStatus((s) => (s === "error" ? s : "paused")));
  }, []);

  // Intersection-based loading + offscreen pause.
  useEffect(() => {
    if (!src) return;
    const el = frameRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!userPaused.current && !prefersReducedData()) play();
        } else if (v && !v.paused) {
          v.pause();
        }
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, play]);

  // Start playback once the freshly created video element is mounted.
  useEffect(() => {
    if (activated && wantPlay.current && videoRef.current) {
      wantPlay.current = false;
      play();
    }
  }, [activated, play]);

  const onPlayPause = () => {
    const v = videoRef.current;
    if (status === "playing" && v) {
      userPaused.current = true;
      v.pause();
    } else {
      userPaused.current = false;
      if (status === "ended" && v) v.currentTime = 0;
      play();
    }
  };

  const onReplay = () => {
    userPaused.current = false;
    const v = videoRef.current;
    if (v) v.currentTime = 0;
    play();
  };

  const onSound = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  };

  const showVideo = activated && status !== "error" && status !== "unavailable";
  const controlsDisabled = status === "unavailable" || status === "error";

  let caption = "Concept film · 15 seconds · muted until you turn sound on";
  if (status === "unavailable") caption = "Concept film coming soon. Showing the poster for now.";
  if (status === "error") caption = "The film couldn't be loaded, so the poster is shown instead.";

  return (
    <figure className="film-stage dark-surface" aria-label="Hackulator concept film">
      <div className="film-stage__frame" ref={frameRef}>
        <picture>
          <source srcSet={poster} type="image/webp" />
          <img
            src={posterFallback}
            width={1080}
            height={1350}
            alt="Hackulator logo on a black background: poster for the concept film"
            fetchPriority="high"
          />
        </picture>
        {showVideo && (
          <video
            ref={videoRef}
            src={src}
            poster={posterFallback}
            muted={muted}
            playsInline
            preload="auto"
            aria-label="Hackulator concept film: component assembly, exploded view, colour-screen reveal and logo"
            onPlay={() => setStatus("playing")}
            onPause={() => setStatus((s) => (s === "ended" ? s : "paused"))}
            onEnded={() => setStatus("ended")}
            onError={() => setStatus("error")}
          />
        )}
        <span className="film-stage__label">Concept visualisation</span>
      </div>
      <div className="film-stage__bar">
        <figcaption className="film-stage__caption">{caption}</figcaption>
        <div className="film-stage__controls">
          <button type="button" className="icon-btn" onClick={onPlayPause} disabled={controlsDisabled}>
            {status === "playing" ? <PauseIcon /> : <PlayIcon />}
            <span>{status === "playing" ? "Pause" : "Play"}</span>
          </button>
          <button type="button" className="icon-btn" onClick={onReplay} disabled={controlsDisabled || !activated}>
            <ReplayIcon />
            <span className="visually-hidden">Replay</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onSound}
            disabled={controlsDisabled}
            aria-pressed={!muted}
          >
            {muted ? <SoundOffIcon /> : <SoundOnIcon />}
            <span className="visually-hidden">Sound</span>
          </button>
        </div>
      </div>
      <p className="visually-hidden">
        This is a photograph-assisted 3D concept sequence, not a manufacturing render or footage of a finished device.
      </p>
    </figure>
  );
}
