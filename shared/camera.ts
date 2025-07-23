export interface CameraRequest {
  path?: string;
  cameraId?: string;
  sessionId?: string;
  streamId?: string;
}

export interface CameraResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface CameraInfo {
  id: string;
  name: string;
  status: "active" | "inactive";
  resolution: string;
}

export interface CameraStatus {
  cameras: CameraInfo[];
  isRecording: boolean;
  isStreaming: boolean;
}
