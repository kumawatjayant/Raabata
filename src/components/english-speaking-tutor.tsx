import { useEffect, useMemo, useState } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Orb, type OrbState, type OrbThemeConfig } from "orb-ui";
import { createSarvamOrbAdapter } from "@/lib/sarvam-voice-client";

const VOICE_ORB_THEME: OrbThemeConfig = {
  name: "radial",
  preset: "expressive",
  appearance: {
    deepColor: "#06113c",
    cobaltColor: "#1d4ed8",
    aquaColor: "#38bdf8",
    paleColor: "#e0f2fe",
    membraneColor: "#818cf8",
    seamColor: "#f8fafc",
  },
};

export function EnglishSpeakingTutor() {
  const [mounted, setMounted] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const controller = useMemo(
    () =>
      createSarvamOrbAdapter({
        onError: (message) => setErrorMessage(message),
      }),
    [],
  );

  useEffect(() => {
    setMounted(true);
    const unsubscribe = controller.adapter.subscribe((signal) => {
      setOrbState(signal.state);
      if (signal.state !== "error" && signal.state !== "idle") {
        setErrorMessage(null);
      }
      if (signal.state === "idle") {
        setMuted(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [controller]);

  const isActive = orbState === "connecting" || orbState === "listening" || orbState === "speaking";

  function handleOrbClick() {
    if (isActive) {
      void controller.stop();
      return;
    }
    setErrorMessage(null);
    setMuted(false);
    void controller.adapter.start?.();
  }

  function handleToggleMute() {
    const nextMuted = !muted;
    controller.setMuted(nextMuted);
    setMuted(nextMuted);
  }

  let statusLabel = "Tap the orb to start speaking";
  if (orbState === "connecting") {
    statusLabel = "Connecting…";
  } else if (orbState === "listening") {
    statusLabel = muted ? "Microphone muted" : "Listening — speak freely";
  } else if (orbState === "speaking") {
    statusLabel = "Speaking…";
  } else if (orbState === "error") {
    statusLabel = errorMessage ?? "Couldn't connect — tap the orb to retry";
  }

  return (
    <div
      className={`voice-orb-stage is-${orbState}`}
      role="region"
      aria-label="Spoken English Voice Practice"
    >
      <div className="voice-orb-ambient" aria-hidden="true" />

      <div className="voice-orb-slot">
        <button
          type="button"
          className="voice-orb-trigger"
          onClick={handleOrbClick}
          aria-label={isActive ? "End English speaking session" : "Start English speaking session"}
          aria-pressed={isActive}
        >
          {mounted ? (
            <Orb
              adapter={controller.adapter}
              theme={VOICE_ORB_THEME}
              size={236}
              interactive={false}
            />
          ) : (
            <span className="voice-orb-placeholder" aria-hidden="true" />
          )}
        </button>
      </div>

      <p
        className={`voice-orb-status ${orbState === "error" ? "is-error" : ""}`}
        aria-live="polite"
      >
        {statusLabel}
      </p>

      {isActive && (
        <div className="voice-orb-controls">
          <button
            type="button"
            className={`voice-orb-pill ${muted ? "is-muted" : ""}`}
            onClick={handleToggleMute}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          >
            {muted ? <MicOff size={15} /> : <Mic size={15} />}
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>
          <button
            type="button"
            className="voice-orb-pill is-end"
            onClick={() => void controller.stop()}
            aria-label="End voice session"
          >
            <PhoneOff size={15} />
            <span>End</span>
          </button>
        </div>
      )}
    </div>
  );
}
