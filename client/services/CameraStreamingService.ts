export interface CameraStreamConfig {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: "user" | "environment";
}

export interface StreamingOptions {
  videoBitrate?: number;
  audioBitrate?: number;
  codec?: string;
  resolution?: string;
}

export interface DetectionBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  color: string;
}

export class CameraStreamingService {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private recordingStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: BlobPart[] = [];
  private isRecording = false;
  private isStreaming = false;
  private detectionBoxes: DetectionBox[] = [];
  private animationFrameId: number | null = null;
  private websocket: WebSocket | null = null;
  private streamEndpoint = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvasContext = this.canvas.getContext("2d");
  }

  // Initialize camera stream
  async initializeCamera(
    config: CameraStreamConfig = {},
  ): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: config.deviceId ? { exact: config.deviceId } : undefined,
          width: config.width || 1920,
          height: config.height || 1080,
          frameRate: config.frameRate || 30,
          facingMode: config.facingMode || "environment",
        },
        audio: true,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.mediaStream;
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw new Error("Failed to access camera. Please check permissions.");
    }
  }

  // Get available camera devices
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }); // Request permissions first
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Error getting camera devices:", error);
      return [];
    }
  }

  // Attach stream to video element
  attachStreamToVideo(
    videoElement: HTMLVideoElement,
    stream: MediaStream,
  ): void {
    this.videoElement = videoElement;
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
  }

  // Start streaming to server
  async startStreaming(
    endpoint: string,
    options: StreamingOptions = {},
  ): Promise<void> {
    if (!this.mediaStream) {
      throw new Error("No camera stream available. Initialize camera first.");
    }

    this.streamEndpoint = endpoint;
    this.isStreaming = true;

    try {
      // Setup WebSocket connection for streaming
      this.websocket = new WebSocket(endpoint.replace("http", "ws"));

      this.websocket.onopen = () => {
        console.log("Streaming WebSocket connected");
        this.sendStreamData(options);
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket streaming error:", error);
        this.fallbackToHTTPStreaming(endpoint, options);
      };

      this.websocket.onclose = () => {
        console.log("Streaming WebSocket disconnected");
        this.isStreaming = false;
      };
    } catch (error) {
      console.error("Error starting stream:", error);
      this.fallbackToHTTPStreaming(endpoint, options);
    }
  }

  // Fallback HTTP streaming
  private async fallbackToHTTPStreaming(
    endpoint: string,
    options: StreamingOptions,
  ): Promise<void> {
    if (!this.mediaStream) return;

    try {
      // Create MediaRecorder for HTTP streaming
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        videoBitsPerSecond: options.videoBitrate || 2500000,
        audioBitsPerSecond: options.audioBitrate || 128000,
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.isStreaming) {
          await this.sendChunkToServer(endpoint, event.data);
        }
      };

      this.mediaRecorder.start(100); // Send chunks every 100ms
    } catch (error) {
      console.error("HTTP streaming fallback failed:", error);
    }
  }

  // Send stream data via WebSocket
  private sendStreamData(options: StreamingOptions): void {
    if (
      !this.mediaStream ||
      !this.websocket ||
      !this.canvas ||
      !this.canvasContext
    )
      return;

    const video = document.createElement("video");
    video.srcObject = this.mediaStream;
    video.autoplay = true;
    video.muted = true;

    video.onloadedmetadata = () => {
      this.canvas!.width = video.videoWidth;
      this.canvas!.height = video.videoHeight;
      this.sendFrames(video, options);
    };
  }

  // Send video frames
  private sendFrames(video: HTMLVideoElement, options: StreamingOptions): void {
    if (
      !this.isStreaming ||
      !this.websocket ||
      !this.canvas ||
      !this.canvasContext
    )
      return;

    this.canvasContext.drawImage(
      video,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    // Draw detection boxes
    this.drawDetectionBoxes();

    this.canvas.toBlob(
      async (blob) => {
        if (
          blob &&
          this.websocket &&
          this.websocket.readyState === WebSocket.OPEN
        ) {
          const arrayBuffer = await blob.arrayBuffer();
          this.websocket.send(arrayBuffer);
        }
      },
      "image/jpeg",
      0.8,
    );

    // Continue sending frames
    this.animationFrameId = requestAnimationFrame(() =>
      this.sendFrames(video, options),
    );
  }

  // Send chunk to server via HTTP
  private async sendChunkToServer(
    endpoint: string,
    chunk: Blob,
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("timestamp", Date.now().toString());

      await fetch(`${endpoint}/stream-chunk`, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Error sending chunk to server:", error);
    }
  }

  // Stop streaming
  stopStreaming(): void {
    this.isStreaming = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  // Start recording
  async startRecording(options: { mimeType?: string } = {}): Promise<void> {
    if (!this.mediaStream) {
      throw new Error("No camera stream available. Initialize camera first.");
    }

    const mimeType = options.mimeType || this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      console.log("Recording stopped");
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  // Stop recording and return blob
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || "video/webm",
        });
        this.recordedChunks = [];
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Take screenshot
  async takeScreenshot(): Promise<Blob> {
    if (!this.videoElement) {
      throw new Error("No video element available");
    }

    if (!this.canvas || !this.canvasContext) {
      throw new Error("Canvas not initialized");
    }

    // Set canvas size to match video
    this.canvas.width = this.videoElement.videoWidth;
    this.canvas.height = this.videoElement.videoHeight;

    // Draw video frame to canvas
    this.canvasContext.drawImage(this.videoElement, 0, 0);

    // Draw detection boxes
    this.drawDetectionBoxes();

    return new Promise((resolve) => {
      this.canvas!.toBlob(
        (blob) => {
          resolve(blob!);
        },
        "image/jpeg",
        0.9,
      );
    });
  }

  // Update detection boxes
  updateDetectionBoxes(boxes: DetectionBox[]): void {
    this.detectionBoxes = boxes;
  }

  // Draw detection boxes on canvas
  private drawDetectionBoxes(): void {
    if (!this.canvasContext || !this.canvas) return;

    this.detectionBoxes.forEach((box) => {
      this.canvasContext!.strokeStyle = box.color;
      this.canvasContext!.lineWidth = 2;
      this.canvasContext!.strokeRect(
        box.x * this.canvas!.width,
        box.y * this.canvas!.height,
        box.width * this.canvas!.width,
        box.height * this.canvas!.height,
      );

      // Draw label
      this.canvasContext!.fillStyle = box.color;
      this.canvasContext!.font = "14px Arial";
      this.canvasContext!.fillText(
        `${box.label} (${Math.round(box.confidence * 100)}%)`,
        box.x * this.canvas!.width,
        box.y * this.canvas!.height - 5,
      );
    });
  }

  // Get supported MIME type for recording
  private getSupportedMimeType(): string {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "video/webm";
  }

  // Save blob to file
  async saveToFile(blob: Blob, filename: string, path?: string): Promise<void> {
    try {
      // For browsers that support File System Access API
      if ("showSaveFilePicker" in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          startIn: path ? "downloads" : "downloads",
          types: [
            {
              description: "Media files",
              accept: {
                "video/*": [".mp4", ".webm"],
                "image/*": [".jpg", ".jpeg", ".png"],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback: download via anchor element
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  }

  // Cleanup resources
  cleanup(): void {
    this.stopStreaming();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach((track) => track.stop());
      this.recordingStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  // Getters
  get isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  get isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  get currentStream(): MediaStream | null {
    return this.mediaStream;
  }
}
