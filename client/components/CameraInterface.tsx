import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Paperclip,
  FolderOpen,
  Camera,
  Video,
  Square,
  AlertCircle,
} from "lucide-react";
import { CameraRequest, CameraResponse, CameraStatus } from "@shared/camera";
import {
  CameraStreamingService,
  DetectionBox,
} from "../services/CameraStreamingService";

export default function CameraInterface() {
  const [screenshotPath, setScreenshotPath] = useState("");
  const [recordingPath, setRecordingPath] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("camera1");
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentRecordingSession, setCurrentRecordingSession] = useState<
    string | null
  >(null);
  const [currentStreamSession, setCurrentStreamSession] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [cameras, setCameras] = useState([
    {
      id: "camera1",
      name: "Camera 1 (Main Entrance)",
      status: "active" as const,
      resolution: "1920x1080",
    },
    {
      id: "camera2",
      name: "Camera 2 (Side View)",
      status: "active" as const,
      resolution: "1280x720",
    },
    {
      id: "camera3",
      name: "Camera 3 (Rear View)",
      status: "inactive" as const,
      resolution: "1920x1080",
    },
  ]);

  // Ref for the stream image
  const streamImgRef = useRef<HTMLImageElement>(null);

  // Check if File System Access API is supported
  const isFileSystemAccessSupported = "showDirectoryPicker" in window;

  const selectScreenshotDirectory = async () => {
    try {
      if (isFileSystemAccessSupported) {
        // Use File System Access API for modern browsers
        const directoryHandle = await (window as any).showDirectoryPicker();
        setScreenshotPath(directoryHandle.name + "/");
      } else {
        // Fallback: create a hidden file input for directory selection
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.style.display = "none";

        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            // Get the directory path from the first file
            const firstFile = files[0];
            const pathParts = firstFile.webkitRelativePath.split("/");
            pathParts.pop(); // Remove filename to get directory path
            setScreenshotPath(pathParts.join("/") + "/");
          }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  const selectRecordingDirectory = async () => {
    try {
      if (isFileSystemAccessSupported) {
        // Use File System Access API for modern browsers
        const directoryHandle = await (window as any).showDirectoryPicker();
        setRecordingPath(directoryHandle.name + "/");
      } else {
        // Fallback: create a hidden file input for directory selection
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.style.display = "none";

        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) {
            // Get the directory path from the first file
            const firstFile = files[0];
            const pathParts = firstFile.webkitRelativePath.split("/");
            pathParts.pop(); // Remove filename to get directory path
            setRecordingPath(pathParts.join("/") + "/");
          }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

  useEffect(() => {
    fetchCameraStatus();
    initializeBackendStream();
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      fetchCameraStream();
    }
  }, [selectedCamera]);

  const initializeBackendStream = async () => {
    try {
      setIsLoadingStream(true);
      setError(null);
      // Initialize with default camera
      await fetchCameraStream();
    } catch (error) {
      console.error("Error initializing backend stream:", error);
      setError("Failed to initialize camera stream from backend.");
    } finally {
      setIsLoadingStream(false);
    }
  };

  const fetchCameraStream = async () => {
    try {
      setIsLoadingStream(true);
      setError(null);

      // Fetch stream URL from your backend
      const response = await fetch(`/api/camera/${selectedCamera}/stream`);
      const data: CameraResponse = await response.json();

      if (data.success && data.data?.streamUrl) {
        setStreamUrl(data.data.streamUrl);
      } else {
        // Fallback to a mock stream URL (replace with your actual backend endpoint)
        setStreamUrl(`/api/camera/${selectedCamera}/live-feed`);
      }
    } catch (error) {
      console.error("Error fetching camera stream:", error);
      setError("Failed to fetch camera stream from backend.");
      // Fallback to mock stream
      setStreamUrl(`/api/camera/${selectedCamera}/live-feed`);
    } finally {
      setIsLoadingStream(false);
    }
  };

  const fetchCameraStatus = async () => {
    try {
      const response = await fetch("/api/camera/status");
      const data: CameraResponse = await response.json();
      if (data.success && data.data) {
        setCameras(data.data.cameras);
        setIsRecording(data.data.isRecording);
        setIsStreaming(data.data.isStreaming);
      }
    } catch (error) {
      console.error("Error fetching camera status:", error);
    }
  };

  const handleScreenshot = async () => {
    try {
      // Request screenshot from backend
      const request: CameraRequest = {
        path: screenshotPath,
        cameraId: selectedCamera,
      };

      const response = await fetch("/api/camera/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data: CameraResponse = await response.json();
      if (data.success) {
        console.log("Screenshot taken:", data.data);
        alert(`Screenshot saved: ${data.data.filename}`);
        setError(null);
      }
    } catch (error) {
      console.error("Error taking screenshot:", error);
      setError("Failed to take screenshot. Please try again.");
    }
  };

  const handleStartRecording = async () => {
    try {
      // Start recording session on backend
      const request: CameraRequest = {
        path: recordingPath,
        cameraId: selectedCamera,
      };

      const response = await fetch("/api/camera/start-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data: CameraResponse = await response.json();
      if (data.success) {
        setIsRecording(true);
        setCurrentRecordingSession(data.data.sessionId);
        console.log("Recording started:", data.data);
        setError(null);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to start recording. Please try again.");
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!currentRecordingSession) {
        throw new Error("No active recording session");
      }

      // Stop recording session on backend
      const request: CameraRequest = {
        sessionId: currentRecordingSession,
      };

      const response = await fetch("/api/camera/stop-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data: CameraResponse = await response.json();
      if (data.success) {
        setIsRecording(false);
        setCurrentRecordingSession(null);
        console.log("Recording stopped:", data.data);
        setError(null);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      setError("Failed to stop recording. Please try again.");
    }
  };

  const handleStartStreaming = async () => {
    try {
      // Start streaming session on backend
      const request: CameraRequest = {
        cameraId: selectedCamera,
      };

      const response = await fetch("/api/camera/start-streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data: CameraResponse = await response.json();
      if (data.success) {
        setIsStreaming(true);
        setCurrentStreamSession(data.data.streamId);
        console.log("Streaming started:", data.data);
        setError(null);
      }
    } catch (error) {
      console.error("Error starting streaming:", error);
      setError("Failed to start streaming. Please try again.");
    }
  };

  const handleStopStreaming = async () => {
    try {
      if (!currentStreamSession) {
        throw new Error("No active streaming session");
      }

      // Stop streaming session on backend
      const request: CameraRequest = {
        streamId: currentStreamSession,
      };

      const response = await fetch("/api/camera/stop-streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data: CameraResponse = await response.json();
      if (data.success) {
        setIsStreaming(false);
        setCurrentStreamSession(null);
        console.log("Streaming stopped:", data.data);
        setError(null);
      }
    } catch (error) {
      console.error("Error stopping streaming:", error);
      setError("Failed to stop streaming. Please try again.");
    }
  };

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    // Stream will update automatically via useEffect
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-24 lg:py-20">
        <div className="mb-6 lg:mb-12">
          <div className="text-2xl sm:text-3xl font-bold text-black">
            <span className="text-camera-green">bo</span>viclouds
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
          {/* Camera Feed Area */}
          <div className="flex-1 relative">
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {/* Backend Camera Stream */}
              {streamUrl ? (
                <img
                  ref={streamImgRef}
                  src={streamUrl}
                  alt="Live Camera Feed"
                  className="w-full h-full object-cover"
                  onError={() => {
                    setError("Failed to load camera stream from backend");
                  }}
                  onLoad={() => {
                    setError(null);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">Backend Camera Stream</p>
                    <p className="text-sm opacity-75 mb-4">
                      Waiting for camera stream from backend...
                    </p>
                    <Button
                      onClick={fetchCameraStream}
                      variant="outline"
                      className="text-white border-white"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Retry Connection
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {isLoadingStream && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading camera stream...</p>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {error && (
                <div className="absolute top-16 left-3 right-3 bg-red-500 bg-opacity-90 text-white p-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-white hover:text-gray-200"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Camera Status Badge */}
              <div className="absolute top-3 left-3 sm:top-6 sm:left-6 flex items-center gap-2 bg-black bg-opacity-70 px-2 py-1 sm:px-3 sm:py-2 rounded">
                <div className="w-2 h-2 bg-camera-green rounded-full"></div>
                <span className="text-white text-xs sm:text-sm font-medium">
                  {cameras.find((c) => c.id === selectedCamera)?.name ||
                    "Camera 1 (Main Entrance)"}
                </span>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="w-full xl:w-80 space-y-4 sm:space-y-6">
            {/* File Location for Screenshots */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Paperclip className="w-4 h-4" />
                <span>File Location</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={screenshotPath}
                  onChange={(e) => setScreenshotPath(e.target.value)}
                  placeholder="Enter screenshot save path..."
                  className="h-12 bg-gray-50 border-gray-300 flex-1"
                />
                <Button
                  onClick={selectScreenshotDirectory}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 bg-gray-50 border-gray-300 hover:bg-gray-100"
                  title="Browse for folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Screenshot Button */}
            <Button
              onClick={handleScreenshot}
              className="w-full h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base"
            >
              Screenshot
            </Button>

            {/* File Location for Recording */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Paperclip className="w-4 h-4" />
                <span>File Location</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={recordingPath}
                  onChange={(e) => setRecordingPath(e.target.value)}
                  placeholder="Enter recording save path..."
                  className="h-12 bg-gray-50 border-gray-300 flex-1"
                />
                <Button
                  onClick={selectRecordingDirectory}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 bg-gray-50 border-gray-300 hover:bg-gray-100"
                  title="Browse for folder"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleStartRecording}
                disabled={isRecording}
                className="flex-1 h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base disabled:opacity-50"
              >
                Start Recording
              </Button>
              <Button
                onClick={handleStopRecording}
                disabled={!isRecording}
                className="flex-1 h-12 bg-camera-red hover:bg-camera-red/90 text-white font-medium text-sm sm:text-base disabled:opacity-50"
              >
                Stop Recording
              </Button>
            </div>

            {/* Camera Selection */}
            <div className="space-y-3">
              <Select value={selectedCamera} onValueChange={handleCameraChange}>
                <SelectTrigger className="h-12 bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${camera.status === "active" ? "bg-camera-green" : "bg-gray-400"}`}
                        ></div>
                        {camera.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Streaming Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleStartStreaming}
                disabled={isStreaming}
                className="flex-1 h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base disabled:opacity-50"
              >
                Start Streaming
              </Button>
              <Button
                onClick={handleStopStreaming}
                disabled={!isStreaming}
                className="flex-1 h-12 bg-camera-red hover:bg-camera-red/90 text-white font-medium text-sm sm:text-base disabled:opacity-50"
              >
                Stop Streaming
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
