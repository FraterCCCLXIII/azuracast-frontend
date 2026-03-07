import { useEffect, useRef } from "react";

/**
 * Connects an <audio> element to a Web Audio AnalyserNode on first play.
 * The analyser can then be read each animation frame to get real-time
 * frequency/amplitude data for driving visual effects.
 *
 * Requires the stream to have CORS headers (Access-Control-Allow-Origin).
 * If CORS is unavailable the analyser will silently fail and return null.
 */
export function useAudioAnalyser(
  audioRef: React.RefObject<HTMLAudioElement | null>
): React.RefObject<AnalyserNode | null> {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setup = () => {
      if (analyserRef.current) return;

      try {
        const context = new AudioContext();
        const source = context.createMediaElementSource(audio);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;

        source.connect(analyser);
        analyser.connect(context.destination);

        contextRef.current = context;
        analyserRef.current = analyser;
      } catch (err) {
        console.warn("[useAudioAnalyser] Setup failed — stream may lack CORS headers:", err);
      }
    };

    // Resume suspended context on subsequent plays (browser autoplay policy)
    const resumeContext = () => {
      contextRef.current?.resume();
    };

    audio.addEventListener("play", setup, { once: true });
    audio.addEventListener("play", resumeContext);

    return () => {
      audio.removeEventListener("play", setup);
      audio.removeEventListener("play", resumeContext);
      contextRef.current?.close();
      contextRef.current = null;
      analyserRef.current = null;
    };
  }, [audioRef]);

  return analyserRef;
}
