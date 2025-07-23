import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { handleDemo } from "./routes/demo";
import {
  handleScreenshot,
  handleStartRecording,
  handleStopRecording,
  handleStartStreaming,
  handleStopStreaming,
  handleCameraStatus,
  handleUploadScreenshot,
  handleUploadRecordingChunk,
  handleStreamChunk,
  handleCameraStream,
  handleCameraLiveFeed,
} from "./routes/camera";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(
    fileUpload({
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
      useTempFiles: true,
      tempFileDir: "/tmp/",
      abortOnLimit: true,
    }),
  );

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // Camera API routes
  app.post("/api/camera/screenshot", handleScreenshot);
  app.post("/api/camera/upload-screenshot", handleUploadScreenshot);
  app.post("/api/camera/start-recording", handleStartRecording);
  app.post("/api/camera/stop-recording", handleStopRecording);
  app.post("/api/camera/upload-recording-chunk", handleUploadRecordingChunk);
  app.post("/api/camera/start-streaming", handleStartStreaming);
  app.post("/api/camera/stop-streaming", handleStopStreaming);
  app.post("/api/camera/stream-chunk", handleStreamChunk);
  app.get("/api/camera/:cameraId/stream", handleCameraStream);
  app.get("/api/camera/:cameraId/live-feed", handleCameraLiveFeed);
  app.get("/api/camera/status", handleCameraStatus);

  return app;
}
