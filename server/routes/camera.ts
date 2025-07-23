import { RequestHandler } from "express";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface CameraRequest {
  path?: string;
  cameraId?: string;
  sessionId?: string;
  streamId?: string;
  resolution?: string;
  bitrate?: number;
}

export interface CameraResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface StreamSession {
  id: string;
  cameraId: string;
  startTime: Date;
  path?: string;
  isActive: boolean;
}

// In-memory storage for active sessions (in production, use Redis or database)
const activeSessions = new Map<string, StreamSession>();
const streamingSessions = new Map<string, StreamSession>();

// Screenshot endpoint
export const handleScreenshot: RequestHandler = async (req, res) => {
  try {
    const { path, cameraId } = req.body as CameraRequest;
    const timestamp = Date.now();
    const filename = `screenshot_${cameraId || "cam1"}_${timestamp}.jpg`;
    const savePath = path || "./uploads/screenshots/";
    const fullPath = join(savePath, filename);

    // Ensure directory exists
    if (!existsSync(savePath)) {
      mkdirSync(savePath, { recursive: true });
    }

    console.log(
      `Taking screenshot from camera ${cameraId || "default"} to path: ${fullPath}`,
    );

    const response: CameraResponse = {
      success: true,
      message:
        "Screenshot endpoint ready - send image data to /api/camera/upload-screenshot",
      data: {
        filename,
        path: fullPath,
        timestamp: new Date().toISOString(),
        uploadEndpoint: "/api/camera/upload-screenshot",
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Screenshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to prepare screenshot",
      data: { error: (error as Error).message },
    });
  }
};

// Start recording endpoint
export const handleStartRecording: RequestHandler = (req, res) => {
  try {
    const { path, cameraId, resolution, bitrate } = req.body as CameraRequest;
    const sessionId = `rec_${Date.now()}_${cameraId || "cam1"}`;
    const savePath = path || "./uploads/recordings/";

    // Ensure directory exists
    if (!existsSync(savePath)) {
      mkdirSync(savePath, { recursive: true });
    }

    // Create recording session
    const session: StreamSession = {
      id: sessionId,
      cameraId: cameraId || "camera1",
      startTime: new Date(),
      path: savePath,
      isActive: true,
    };

    activeSessions.set(sessionId, session);

    console.log(
      `Starting recording session ${sessionId} from camera ${cameraId || "default"} to path: ${savePath}`,
    );

    const response: CameraResponse = {
      success: true,
      message: "Recording session started successfully",
      data: {
        sessionId,
        filename: `recording_${sessionId}.webm`,
        path: savePath,
        startTime: session.startTime.toISOString(),
        uploadEndpoint: "/api/camera/upload-recording-chunk",
        settings: {
          resolution: resolution || "1920x1080",
          bitrate: bitrate || 2500000,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Start recording error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start recording",
      data: { error: (error as Error).message },
    });
  }
};

// Stop recording endpoint
export const handleStopRecording: RequestHandler = (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Recording session not found",
      });
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - session.startTime.getTime()) / 1000,
    );
    const durationFormatted = new Date(duration * 1000)
      .toISOString()
      .substr(11, 8);

    // Mark session as inactive
    session.isActive = false;

    console.log(
      `Stopping recording session: ${sessionId}, duration: ${durationFormatted}`,
    );

    const response: CameraResponse = {
      success: true,
      message: "Recording stopped successfully",
      data: {
        sessionId,
        startTime: session.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationFormatted,
        durationSeconds: duration,
        path: session.path,
      },
    };

    // Clean up session after a delay (to allow final chunks)
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 5000);

    res.json(response);
  } catch (error) {
    console.error("Stop recording error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop recording",
      data: { error: (error as Error).message },
    });
  }
};

// Start streaming endpoint
export const handleStartStreaming: RequestHandler = (req, res) => {
  try {
    const { cameraId, resolution, bitrate } = req.body as CameraRequest;
    const streamId = `stream_${Date.now()}_${cameraId || "cam1"}`;

    // Create streaming session
    const session: StreamSession = {
      id: streamId,
      cameraId: cameraId || "camera1",
      startTime: new Date(),
      isActive: true,
    };

    streamingSessions.set(streamId, session);

    console.log(
      `Starting streaming session ${streamId} from camera ${cameraId || "default"}`,
    );

    const response: CameraResponse = {
      success: true,
      message: "Streaming session started successfully",
      data: {
        streamId,
        streamUrl: `ws://localhost:8080/api/camera/stream/${streamId}`,
        httpEndpoint: "/api/camera/stream-chunk",
        startTime: session.startTime.toISOString(),
        settings: {
          resolution: resolution || "1920x1080",
          bitrate: bitrate || 2500000,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Start streaming error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start streaming",
      data: { error: (error as Error).message },
    });
  }
};

// Stop streaming endpoint
export const handleStopStreaming: RequestHandler = (req, res) => {
  try {
    const { streamId } = req.body;

    const session = streamingSessions.get(streamId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Streaming session not found",
      });
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.round(
      (endTime.getTime() - session.startTime.getTime()) / 1000,
    );
    const durationFormatted = new Date(duration * 1000)
      .toISOString()
      .substr(11, 8);

    // Mark session as inactive
    session.isActive = false;

    console.log(
      `Stopping streaming session: ${streamId}, duration: ${durationFormatted}`,
    );

    const response: CameraResponse = {
      success: true,
      message: "Streaming stopped successfully",
      data: {
        streamId,
        startTime: session.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationFormatted,
        durationSeconds: duration,
      },
    };

    // Clean up session
    setTimeout(() => {
      streamingSessions.delete(streamId);
    }, 1000);

    res.json(response);
  } catch (error) {
    console.error("Stop streaming error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop streaming",
      data: { error: (error as Error).message },
    });
  }
};

// Upload screenshot endpoint
export const handleUploadScreenshot: RequestHandler = async (req, res) => {
  try {
    const { filename, path: savePath } = req.body;

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const imageFile = Array.isArray(req.files.image)
      ? req.files.image[0]
      : req.files.image;
    const fullPath = join(
      savePath || "./uploads/screenshots/",
      filename || `screenshot_${Date.now()}.jpg`,
    );

    // Ensure directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Save file
    await imageFile.mv(fullPath);

    const response: CameraResponse = {
      success: true,
      message: "Screenshot saved successfully",
      data: {
        filename: filename || `screenshot_${Date.now()}.jpg`,
        path: fullPath,
        size: imageFile.size,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Upload screenshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save screenshot",
      data: { error: (error as Error).message },
    });
  }
};

// Upload recording chunk endpoint
export const handleUploadRecordingChunk: RequestHandler = async (req, res) => {
  try {
    const { sessionId, isLastChunk } = req.body;

    if (!req.files || !req.files.chunk) {
      return res.status(400).json({
        success: false,
        message: "No chunk file provided",
      });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Recording session not found",
      });
    }

    const chunkFile = Array.isArray(req.files.chunk)
      ? req.files.chunk[0]
      : req.files.chunk;
    const chunkPath = join(
      session.path || "./uploads/recordings/",
      `${sessionId}_chunk_${Date.now()}.webm`,
    );

    // Save chunk
    await chunkFile.mv(chunkPath);

    if (isLastChunk === "true") {
      // Mark session as completed
      session.isActive = false;
      console.log(`Recording session ${sessionId} completed`);
    }

    const response: CameraResponse = {
      success: true,
      message:
        isLastChunk === "true"
          ? "Recording completed and saved"
          : "Chunk uploaded successfully",
      data: {
        sessionId,
        chunkPath,
        isCompleted: isLastChunk === "true",
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Upload recording chunk error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save recording chunk",
      data: { error: (error as Error).message },
    });
  }
};

// Stream chunk endpoint for live streaming
export const handleStreamChunk: RequestHandler = async (req, res) => {
  try {
    const { streamId, timestamp } = req.body;

    if (!req.files || !req.files.chunk) {
      return res.status(400).json({
        success: false,
        message: "No stream chunk provided",
      });
    }

    const session = streamingSessions.get(streamId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Streaming session not found",
      });
    }

    // Process stream chunk (forward to your backend, save, or stream to clients)
    console.log(
      `Processing stream chunk for session ${streamId} at ${timestamp}`,
    );

    // Here you would typically forward this to your actual streaming backend
    // For now, we'll just acknowledge receipt

    const response: CameraResponse = {
      success: true,
      message: "Stream chunk processed",
      data: {
        streamId,
        timestamp,
        processed: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Stream chunk error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process stream chunk",
      data: { error: (error as Error).message },
    });
  }
};

// Get camera stream endpoint
export const handleCameraStream: RequestHandler = (req, res) => {
  const { cameraId } = req.params;

  // Return the stream URL for the selected camera
  // Replace this with your actual backend camera stream URL
  const response: CameraResponse = {
    success: true,
    message: "Camera stream URL retrieved successfully",
    data: {
      streamUrl: `https://your-backend-api.com/camera/${cameraId}/stream`, // Replace with your actual stream endpoint
      cameraId,
      resolution: "1920x1080",
      frameRate: 30,
    },
  };

  res.json(response);
};

// Get camera live feed (for direct image streaming)
export const handleCameraLiveFeed: RequestHandler = (req, res) => {
  const { cameraId } = req.params;

  // This endpoint should stream live images from your backend
  // For now, return a placeholder response
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // In a real implementation, you would:
  // 1. Connect to your camera backend
  // 2. Stream the live camera feed
  // 3. Return the image data

  // For demo purposes, return a 404 so the frontend shows the placeholder
  res
    .status(404)
    .send("Camera feed not available - replace with your backend stream");
};

// Get camera status endpoint
export const handleCameraStatus: RequestHandler = (req, res) => {
  const activeRecordings = Array.from(activeSessions.values()).filter(
    (s) => s.isActive,
  ).length;
  const activeStreams = Array.from(streamingSessions.values()).filter(
    (s) => s.isActive,
  ).length;

  const response: CameraResponse = {
    success: true,
    message: "Camera status retrieved successfully",
    data: {
      cameras: [
        {
          id: "camera1",
          name: "Camera 1 (Main Entrance)",
          status: "active",
          resolution: "1920x1080",
        },
        {
          id: "camera2",
          name: "Camera 2 (Side View)",
          status: "active",
          resolution: "1280x720",
        },
        {
          id: "camera3",
          name: "Camera 3 (Rear View)",
          status: "inactive",
          resolution: "1920x1080",
        },
      ],
      isRecording: activeRecordings > 0,
      isStreaming: activeStreams > 0,
      activeRecordings,
      activeStreams,
      activeSessions: Array.from(activeSessions.keys()),
      streamingSessions: Array.from(streamingSessions.keys()),
    },
  };

  res.json(response);
};
