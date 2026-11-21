import type { OrbAdapter, OrbSignal, OrbSignalListener, OrbState } from "orb-ui";

const DEFAULT_SAMPLE_RATE = 16000;
const CHUNK_MS = 30;
const CHUNK_SAMPLES = Math.floor((DEFAULT_SAMPLE_RATE * CHUNK_MS) / 1000);
const SILENCE_PACKET_BYTES = CHUNK_SAMPLES * 2;
const SPEECH_RMS_THRESHOLD = 0.015;

export interface SarvamOrbController {
  adapter: OrbAdapter;
  setMuted: (muted: boolean) => void;
  getMuted: () => boolean;
  stop: () => Promise<void>;
}

/**
 * Append Sarvam Samvaad real-time voice parameters to a server-signed WebSocket URL
 * while preserving all existing auth signature tokens.
 */
export function buildSignedVoiceWsUrl(
  baseWsUrl: string,
  options: {
    userIdentifier: string;
    inputSampleRate?: number;
    outputSampleRate?: number;
  },
): string {
  const url = new URL(baseWsUrl);
  url.searchParams.set("user_identifier", options.userIdentifier);
  url.searchParams.set("user_identifier_type", "custom");
  url.searchParams.set("input_sample_rate", String(options.inputSampleRate ?? DEFAULT_SAMPLE_RATE));
  url.searchParams.set(
    "output_sample_rate",
    String(options.outputSampleRate ?? DEFAULT_SAMPLE_RATE),
  );
  url.searchParams.set("interaction_type", "call");
  return url.toString();
}

/** Linear-interpolation resampler for mono PCM Float32 buffers. */
export function resampleFloat32(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (samples.length === 0 || fromRate === toRate || fromRate <= 0 || toRate <= 0) {
    return samples;
  }
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, samples.length - 1);
    const frac = srcPos - idx0;
    const s0 = samples[idx0] ?? 0;
    const s1 = samples[idx1] ?? s0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return out;
}

/** Encode normalized mono Float32 samples into little-endian linear16 PCM bytes. */
export function float32ToInt16Pcm(samples: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0;
    const clamped = Math.max(-1, Math.min(1, s));
    const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    view.setInt16(i * 2, Math.max(-32768, Math.min(32767, int16)), true);
  }
  return new Uint8Array(buffer);
}

/** Decode little-endian linear16 PCM bytes into normalized mono Float32 samples. */
export function int16PcmToFloat32(bytes: Uint8Array): Float32Array {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

/** Compute normalized RMS amplitude (0..1) from little-endian linear16 PCM bytes. */
export function computePcmRms(bytes: Uint8Array): number {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  if (sampleCount <= 0) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  let sumSq = 0;
  for (let i = 0; i < sampleCount; i++) {
    const normalized = view.getInt16(i * 2, true) / 32768;
    sumSq += normalized * normalized;
  }
  return Math.sqrt(sumSq / sampleCount);
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 4096;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j] ?? 0);
    }
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

const CAPTURE_WORKLET_SOURCE = `
class RabataPcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}
registerProcessor("rabata-pcm-capture", RabataPcmCaptureProcessor);
`;

async function requestMicStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      throw err;
    }
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

function friendlySessionError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Allow microphone access to start talking.";
    }
    if (err.name === "NotFoundError") {
      return "No microphone found on this device.";
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Couldn't connect right now — tap the orb to retry.";
}

/**
 * Creates a real-time browser duplex voice session controller + OrbAdapter
 * backed by the server-minted Sarvam Samvaad WebSocket URL.
 */
export function createSarvamOrbAdapter(options?: {
  sessionEndpoint?: string;
  onError?: (message: string) => void;
}): SarvamOrbController {
  const sessionEndpoint = options?.sessionEndpoint ?? "/api/english-tutor/session";
  const listeners = new Set<OrbSignalListener>();

  let currentSignal: OrbSignal = { state: "idle", inputVolume: 0, outputVolume: 0 };
  let activeToken = 0;
  let muted = false;

  let ws: WebSocket | null = null;
  let captureContext: AudioContext | null = null;
  let playbackContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let captureNode: AudioNode | null = null;
  let zeroSinkNode: GainNode | null = null;
  let silenceTimer: ReturnType<typeof setInterval> | null = null;
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  let meterRafId: number | null = null;
  let pendingCaptureBytes = new Uint8Array(0);
  let nextPlayTime = 0;
  let utteranceCompleted = false;
  const activeSources = new Set<AudioBufferSourceNode>();
  let configuredInputRate = DEFAULT_SAMPLE_RATE;
  let configuredOutputRate = DEFAULT_SAMPLE_RATE;

  function emit(signal: OrbSignal) {
    currentSignal = signal;
    for (const listener of listeners) {
      listener(signal);
    }
  }

  function setState(state: OrbState, error?: unknown) {
    const next: OrbSignal = {
      state,
      inputVolume: state === "listening" ? (currentSignal.inputVolume ?? 0) : 0,
      outputVolume: state === "speaking" ? (currentSignal.outputVolume ?? 0) : 0,
    };
    if (error !== undefined) {
      next.error = error;
    }
    emit(next);
  }

  function clearDrainTimer() {
    if (drainTimer !== null) {
      clearTimeout(drainTimer);
      drainTimer = null;
    }
  }

  function stopPlaybackSources() {
    for (const src of activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already stopped
      }
    }
    activeSources.clear();
    nextPlayTime = 0;
  }

  function sendJson(payload: Record<string, unknown>) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function sendAudioPacket(pcmBytes: Uint8Array) {
    sendJson({
      type: "client.media.audio_chunk",
      origin: "client",
      timestamp: Date.now() / 1000,
      audio_base64: uint8ToBase64(pcmBytes),
      format: "linear16",
      sample_rate: configuredInputRate,
    });
  }

  function appendAndSendMicSamples(samples: Float32Array) {
    if (!captureContext) return;
    const resampled = resampleFloat32(samples, captureContext.sampleRate, configuredInputRate);
    const pcmBytes = float32ToInt16Pcm(resampled);

    if (!muted && currentSignal.state === "listening") {
      const rms = computePcmRms(pcmBytes);
      const inputVolume = Math.min(1, rms * 5);
      emit({ state: "listening", inputVolume, outputVolume: 0 });
    }

    if (muted || !ws || ws.readyState !== WebSocket.OPEN) {
      pendingCaptureBytes = new Uint8Array(0);
      return;
    }

    const packetSize = Math.floor((configuredInputRate * CHUNK_MS) / 1000) * 2;
    const combined = new Uint8Array(pendingCaptureBytes.length + pcmBytes.length);
    combined.set(pendingCaptureBytes, 0);
    combined.set(pcmBytes, pendingCaptureBytes.length);

    let offset = 0;
    while (offset + packetSize <= combined.length) {
      sendAudioPacket(combined.subarray(offset, offset + packetSize));
      offset += packetSize;
    }
    pendingCaptureBytes = combined.subarray(offset);
  }

  function startSilenceKeepalive() {
    if (silenceTimer !== null) return;
    const silenceBytes = new Uint8Array(SILENCE_PACKET_BYTES);
    silenceTimer = setInterval(() => {
      if (muted && ws && ws.readyState === WebSocket.OPEN) {
        sendAudioPacket(silenceBytes);
      }
    }, 25);
  }

  function stopSilenceKeepalive() {
    if (silenceTimer !== null) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
  }

  function startOutputMeterLoop() {
    if (meterRafId !== null || typeof requestAnimationFrame !== "function") return;
    const tick = () => {
      if (currentSignal.state === "speaking" && analyserNode) {
        const buf = new Float32Array(analyserNode.fftSize);
        analyserNode.getFloatTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] ?? 0;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        const outputVolume = Math.min(1, rms * 5.2);
        emit({ state: "speaking", inputVolume: 0, outputVolume });
      }
      if (ws || currentSignal.state === "connecting") {
        meterRafId = requestAnimationFrame(tick);
      } else {
        meterRafId = null;
      }
    };
    meterRafId = requestAnimationFrame(tick);
  }

  function stopOutputMeterLoop() {
    if (meterRafId !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(meterRafId);
      meterRafId = null;
    }
  }

  async function setupAudioPipeline(token: number) {
    if (!captureContext || !mediaStream || token !== activeToken) return;
    sourceNode = captureContext.createMediaStreamSource(mediaStream);
    zeroSinkNode = captureContext.createGain();
    zeroSinkNode.gain.value = 0;
    zeroSinkNode.connect(captureContext.destination);

    let workletReady = false;
    if (typeof AudioWorkletNode !== "undefined" && captureContext.audioWorklet) {
      let blobUrl = "";
      try {
        const blob = new Blob([CAPTURE_WORKLET_SOURCE], { type: "application/javascript" });
        blobUrl = URL.createObjectURL(blob);
        await captureContext.audioWorklet.addModule(blobUrl);
        if (token !== activeToken) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        const workletNode = new AudioWorkletNode(captureContext, "rabata-pcm-capture");
        workletNode.port.onmessage = (evt: MessageEvent<Float32Array>) => {
          if (evt.data instanceof Float32Array) {
            appendAndSendMicSamples(evt.data);
          }
        };
        sourceNode.connect(workletNode);
        workletNode.connect(zeroSinkNode);
        captureNode = workletNode;
        workletReady = true;
      } catch {
        workletReady = false;
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }
    }

    if (!workletReady && token === activeToken) {
      const processor = captureContext.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (evt: AudioProcessingEvent) => {
        const channel = evt.inputBuffer.getChannelData(0);
        appendAndSendMicSamples(channel);
      };
      sourceNode.connect(processor);
      processor.connect(zeroSinkNode);
      captureNode = processor;
    }
  }

  function enqueueAgentAudio(audioBase64: string, sampleRate: number) {
    if (!playbackContext) return;
    if (playbackContext.state === "suspended") {
      void playbackContext.resume();
    }
    const bytes = base64ToUint8(audioBase64);
    const rms = computePcmRms(bytes);
    const rawFloat32 = int16PcmToFloat32(bytes);
    if (rawFloat32.length === 0) return;

    const outRate = playbackContext.sampleRate;
    const samples =
      sampleRate === outRate ? rawFloat32 : resampleFloat32(rawFloat32, sampleRate, outRate);

    const buffer = playbackContext.createBuffer(1, samples.length, outRate);
    buffer.getChannelData(0).set(samples);

    const src = playbackContext.createBufferSource();
    src.buffer = buffer;
    if (analyserNode) {
      src.connect(analyserNode);
    } else {
      src.connect(playbackContext.destination);
    }

    activeSources.add(src);
    src.onended = () => {
      activeSources.delete(src);
    };

    const now = playbackContext.currentTime;
    if (nextPlayTime <= now) {
      nextPlayTime = now + 0.015;
    }
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;

    if (rms > SPEECH_RMS_THRESHOLD && currentSignal.state !== "speaking") {
      emit({
        state: "speaking",
        inputVolume: 0,
        outputVolume: Math.min(1, rms * 4.5),
      });
    }
  }

  function scheduleListeningTransition() {
    clearDrainTimer();
    if (currentSignal.state !== "speaking") return;
    const now = playbackContext?.currentTime ?? 0;
    const remainingMs = Math.max(0, (nextPlayTime - now) * 1000) + 180;
    drainTimer = setTimeout(() => {
      drainTimer = null;
      if (currentSignal.state === "speaking" && utteranceCompleted) {
        utteranceCompleted = false;
        nextPlayTime = 0;
        emit({ state: "listening", inputVolume: 0, outputVolume: 0 });
      }
    }, remainingMs);
  }

  async function cleanup(nextState: OrbState = "idle", errorMessage?: string) {
    activeToken += 1;
    clearDrainTimer();
    stopSilenceKeepalive();
    stopOutputMeterLoop();
    utteranceCompleted = false;
    pendingCaptureBytes = new Uint8Array(0);

    const socket = ws;
    ws = null;
    if (socket) {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "client.action.interaction_end",
              origin: "client",
              timestamp: Date.now() / 1000,
            }),
          );
        }
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      } catch {
        // ignore close errors
      }
    }

    stopPlaybackSources();

    try {
      captureNode?.disconnect();
    } catch {
      // ignore
    }
    captureNode = null;

    try {
      zeroSinkNode?.disconnect();
    } catch {
      // ignore
    }
    zeroSinkNode = null;

    try {
      sourceNode?.disconnect();
    } catch {
      // ignore
    }
    sourceNode = null;

    try {
      analyserNode?.disconnect();
    } catch {
      // ignore
    }
    analyserNode = null;

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    const capCtx = captureContext;
    captureContext = null;
    if (capCtx && capCtx.state !== "closed") {
      try {
        await capCtx.close();
      } catch {
        // ignore
      }
    }

    const playCtx = playbackContext;
    playbackContext = null;
    if (playCtx && playCtx.state !== "closed") {
      try {
        await playCtx.close();
      } catch {
        // ignore
      }
    }

    if (nextState === "error") {
      if (errorMessage) {
        options?.onError?.(errorMessage);
      }
      setState("error", errorMessage);
    } else {
      emit({ state: nextState, inputVolume: 0, outputVolume: 0 });
    }
  }

  async function start() {
    if (
      currentSignal.state === "connecting" ||
      currentSignal.state === "listening" ||
      currentSignal.state === "speaking"
    ) {
      return;
    }

    await cleanup("idle");
    const myToken = activeToken;
    muted = false;
    emit({ state: "connecting", inputVolume: 0, outputVolume: 0 });

    try {
      // Create and resume AudioContexts synchronously during the click gesture to unlock audio output.
      const AudioCtx = window.AudioContext;
      captureContext = new AudioCtx();
      playbackContext = new AudioCtx();
      analyserNode = playbackContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.connect(playbackContext.destination);

      void captureContext.resume();
      void playbackContext.resume();

      const streamPromise = requestMicStream();
      const sessionPromise = fetch(sessionEndpoint, { method: "POST" });

      const [stream, sessionRes] = await Promise.all([streamPromise, sessionPromise]);

      if (myToken !== activeToken) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      mediaStream = stream;

      let sessionJson: {
        ok?: boolean;
        wsUrl?: string;
        error?: string;
        inputSampleRate?: number;
        outputSampleRate?: number;
      };
      try {
        sessionJson = (await sessionRes.json()) as typeof sessionJson;
      } catch {
        throw new Error("Could not parse server voice response. Please try again.");
      }

      if (!sessionRes.ok || !sessionJson.ok || !sessionJson.wsUrl) {
        throw new Error(sessionJson.error ?? "Could not start voice session right now.");
      }

      configuredInputRate = sessionJson.inputSampleRate ?? DEFAULT_SAMPLE_RATE;
      configuredOutputRate = sessionJson.outputSampleRate ?? DEFAULT_SAMPLE_RATE;

      const socket = new WebSocket(sessionJson.wsUrl);
      ws = socket;

      socket.addEventListener("open", async () => {
        if (myToken !== activeToken) return;
        sendJson({
          type: "client.action.interaction_start",
          origin: "client",
          timestamp: Date.now() / 1000,
        });
        await setupAudioPipeline(myToken);
        startOutputMeterLoop();
      });

      socket.addEventListener("message", (event) => {
        if (myToken !== activeToken) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }

        const msgType = msg["type"];
        if (msgType === "server.system.ping") {
          sendJson({
            type: "client.system.pong",
            origin: "client",
            timestamp: Date.now() / 1000,
            event_id: msg["event_id"],
          });
          return;
        }

        if (msgType === "server.action.interaction_connected") {
          emit({ state: "listening", inputVolume: 0, outputVolume: 0 });
          return;
        }

        if (msgType === "server.media.audio_chunk") {
          const audioBase64 = msg["audio_base64"];
          const status = msg["status"];
          const msgSampleRate =
            typeof msg["sample_rate"] === "number" ? msg["sample_rate"] : configuredOutputRate;

          if (typeof audioBase64 === "string" && audioBase64.length > 0) {
            utteranceCompleted = false;
            clearDrainTimer();
            enqueueAgentAudio(audioBase64, msgSampleRate);
          }

          if (status === "completed") {
            utteranceCompleted = true;
            scheduleListeningTransition();
          }
          return;
        }

        if (msgType === "server.event.user_interrupt") {
          utteranceCompleted = false;
          clearDrainTimer();
          stopPlaybackSources();
          emit({ state: "listening", inputVolume: 0, outputVolume: 0 });
          return;
        }

        if (msgType === "server.action.interaction_end") {
          void cleanup("idle");
        }
      });

      socket.addEventListener("error", () => {
        if (myToken !== activeToken) return;
        void cleanup("error", "Voice connection was interrupted — tap the orb to retry.");
      });

      socket.addEventListener("close", (evt) => {
        console.warn("[Sarvam Voice] WebSocket closed:", {
          code: evt.code,
          reason: evt.reason,
          wasClean: evt.wasClean,
          currentState: currentSignal.state,
        });
        if (myToken !== activeToken) return;
        if (!evt.wasClean && (currentSignal.state === "connecting" || currentSignal.state === "listening")) {
          void cleanup("error", evt.reason || "Connection ended unexpectedly — tap the orb to talk.");
        } else if (currentSignal.state !== "error") {
          void cleanup("idle");
        }
      });
    } catch (err) {
      if (myToken !== activeToken) return;
      await cleanup("error", friendlySessionError(err));
    }
  }

  async function stop() {
    await cleanup("idle");
  }

  function setMuted(nextMuted: boolean) {
    muted = nextMuted;
    if (muted) {
      startSilenceKeepalive();
      if (currentSignal.state === "listening") {
        emit({ state: "listening", inputVolume: 0, outputVolume: 0 });
      }
    } else {
      stopSilenceKeepalive();
    }
  }

  const adapter: OrbAdapter = {
    subscribe(listener) {
      listeners.add(listener);
      listener(currentSignal);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    stop,
  };

  return {
    adapter,
    setMuted,
    getMuted: () => muted,
    stop,
  };
}
