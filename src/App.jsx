import React, { useCallback, useEffect, useRef, useState } from "react";

// backend Python
const BACKEND_URL = "http://127.0.0.1:8000/api/biometrics/enroll";

function Primary({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full rounded-2xl px-5 py-3 text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md transition"
    >
      {children}
    </button>
  );
}

function Ghost({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full rounded-2xl px-5 py-3 border border-gray-300 text-gray-900 bg-white hover:bg-gray-50 transition"
    >
      {children}
    </button>
  );
}

export default function App() {
  const [step, setStep] = useState("intro"); // intro | capture | processing | result
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica permisos.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (step === "capture") startCamera();
    else stopCamera();
  }, [step, startCamera, stopCamera]);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setSnapshotDataUrl(dataUrl);
  }, []);

  const sendToBackend = useCallback(async () => {
    if (!snapshotDataUrl) return setError("Primero toma una foto.");
    setStep("processing");
    try {
      const blob = await (await fetch(snapshotDataUrl)).blob();
      const form = new FormData();
      form.append("image", blob, "face.jpg");

      const res = await fetch(BACKEND_URL, { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        setSuccessMsg("Registro exitoso");
      } else {
        setError(json.message || "Error al procesar");
      }
      setStep("result");
    } catch (err) {
      setError("Falló el envío al backend.");
      setStep("result");
    }
  }, [snapshotDataUrl]);

  const retake = useCallback(async () => {
    setSnapshotDataUrl(null);
    setError(null);

    const video = videoRef.current;
    const stream = streamRef.current;

    if (video && stream) {
      video.srcObject = stream;
      try {
        await video.play();
      } catch {}
    } else {
      await startCamera();
    }
  }, [startCamera]);

  useEffect(() => {
    if (
      step === "capture" &&
      !snapshotDataUrl &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step, snapshotDataUrl]);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto p-6 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">FaceNomad</h1>

      <div className="flex-1 border border-gray-200 rounded-3xl shadow-sm p-6">
        {step === "intro" && (
          <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-3">Reconocimiento facial</h2>
            <p className="text-gray-600 mb-6">
              Esta app capturará tu rostro para registrarte de forma segura.
            </p>
            <div className="mt-auto">
              <Primary onClick={() => setStep("capture")}>Iniciar</Primary>
            </div>
          </div>
        )}

        {step === "capture" && (
          <div className="flex flex-col gap-4 h-full">
            <div className="relative aspect-[3/4] w-full max-w-xs mx-auto select-none">
              {!snapshotDataUrl ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover rounded-[2rem]"
                />
              ) : (
                <img
                  src={snapshotDataUrl}
                  alt="captura"
                  className="absolute inset-0 w-full h-full object-cover rounded-[2rem]"
                />
              )}
              <div className="absolute inset-4 rounded-full border-4 border-violet-600/90 pointer-events-none" />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            {!snapshotDataUrl ? (
              <Primary onClick={takeSnapshot}>Tomar foto</Primary>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <Ghost onClick={retake}>Repetir</Ghost>{" "}
                <Primary onClick={sendToBackend}>Enviar</Primary>
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-20 w-20 border-4 border-violet-600 rounded-full animate-pulse"></div>
            <p className="mt-6 text-lg font-semibold">Procesando...</p>
          </div>
        )}

        {step === "result" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {successMsg ? (
              <>
                <div className="h-16 w-16 bg-green-100 text-green-700 rounded-full grid place-items-center">
                  ✓
                </div>
                <p className="mt-4 text-xl font-semibold">{successMsg}</p>
                <Primary onClick={() => setStep("intro")}>Finalizar</Primary>
              </>
            ) : (
              <>
                <div className="h-16 w-16 bg-red-100 text-red-700 rounded-full grid place-items-center">
                  !
                </div>
                <p className="mt-4 text-xl font-semibold">Error</p>
                <p className="text-gray-500 mb-4">{error}</p>
                <Primary onClick={() => setStep("capture")}>
                  Intentar de nuevo
                </Primary>
              </>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
