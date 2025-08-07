<template>
  <div class="min-h-screen bg-white">
    <!-- Header with Logo -->
    <div class="px-4 py-4 sm:px-6 sm:py-6 lg:px-24 lg:py-20">
      <div class="mb-6 lg:mb-12">
        <div class="text-2xl sm:text-3xl font-bold text-black">
          <span class="text-camera-green">bo</span>viclouds
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex flex-col xl:flex-row gap-6 lg:gap-8">
        <!-- Camera Feed Area -->
        <div class="flex-1 relative">
          <div class="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <!-- Backend Camera Stream -->
            <img
              v-if="streamUrl"
              ref="streamImgRef"
              :src="streamUrl"
              alt="Live Camera Feed"
              class="w-full h-full object-cover"
              @error="onStreamError"
              @load="onStreamLoad"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-800 text-white">
              <div class="text-center">
                <Camera class="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p class="text-lg mb-2">Backend Camera Stream</p>
                <p class="text-sm opacity-75 mb-4">
                  Waiting for camera stream from backend...
                </p>
                <button
                  @click="fetchCameraStream"
                  class="inline-flex items-center px-3 py-2 border border-white text-white hover:bg-white hover:text-gray-800 rounded-md"
                >
                  <Camera class="w-4 h-4 mr-2" />
                  Retry Connection
                </button>
              </div>
            </div>

            <!-- Loading overlay -->
            <div v-if="isLoadingStream" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div class="text-white text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading camera stream...</p>
              </div>
            </div>

            <!-- Error overlay -->
            <div v-if="error" class="absolute top-16 left-3 right-3 bg-red-500 bg-opacity-90 text-white p-3 rounded flex items-center gap-2">
              <AlertCircle class="w-4 h-4" />
              <span class="text-sm">{{ error }}</span>
              <button
                @click="error = null"
                class="ml-auto text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <!-- Camera Status Badge -->
            <div class="absolute top-3 left-3 sm:top-6 sm:left-6 flex items-center gap-2 bg-black bg-opacity-70 px-2 py-1 sm:px-3 sm:py-2 rounded">
              <div class="w-2 h-2 bg-camera-green rounded-full"></div>
              <span class="text-white text-xs sm:text-sm font-medium">
                {{ selectedCameraName }}
              </span>
            </div>
          </div>
        </div>

        <!-- Control Panel -->
        <div class="w-full xl:w-80 space-y-4 sm:space-y-6">
          <!-- Screenshot Section -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <Camera class="w-4 h-4" />
              <span>Screenshot Save Location</span>
            </div>
            <button
              @click="selectScreenshotDirectory"
              class="w-full h-12 bg-gray-50 border border-gray-300 rounded-md text-left px-3 hover:bg-gray-100 flex items-center justify-between"
            >
              <span class="text-sm text-gray-600 truncate">
                {{ screenshotPath || 'Click to select folder...' }}
              </span>
              <FolderOpen class="w-4 h-4 text-gray-400" />
            </button>
            <button
              @click="handleScreenshot"
              :disabled="!screenshotPath"
              class="w-full h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Take Screenshot
            </button>
          </div>

          <!-- Recording Section -->
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <Video class="w-4 h-4" />
              <span>Recording Save Location</span>
            </div>
            <button
              @click="selectRecordingDirectory"
              class="w-full h-12 bg-gray-50 border border-gray-300 rounded-md text-left px-3 hover:bg-gray-100 flex items-center justify-between"
            >
              <span class="text-sm text-gray-600 truncate">
                {{ recordingPath || 'Click to select folder...' }}
              </span>
              <FolderOpen class="w-4 h-4 text-gray-400" />
            </button>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                @click="handleStartRecording"
                :disabled="isRecording || !recordingPath"
                class="flex-1 h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              >
                Start Recording
              </button>
              <button
                @click="handleStopRecording"
                :disabled="!isRecording"
                class="flex-1 h-12 bg-camera-red hover:bg-camera-red/90 text-white font-medium text-sm sm:text-base disabled:opacity-50 rounded-md"
              >
                Stop Recording
              </button>
            </div>
          </div>

          <!-- Camera Selection -->
          <div class="space-y-3">
            <select
              v-model="selectedCamera"
              @change="handleCameraChange"
              class="h-12 bg-gray-50 border border-gray-300 rounded-md px-3 w-full"
            >
              <option
                v-for="camera in cameras"
                :key="camera.id"
                :value="camera.id"
              >
                {{ camera.name }}
              </option>
            </select>
          </div>

          <!-- Streaming Controls -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="handleStartStreaming"
              :disabled="isStreaming"
              class="flex-1 h-12 bg-camera-green hover:bg-camera-green/90 text-white font-medium text-sm sm:text-base disabled:opacity-50 rounded-md"
            >
              Start Streaming
            </button>
            <button
              @click="handleStopStreaming"
              :disabled="!isStreaming"
              class="flex-1 h-12 bg-camera-red hover:bg-camera-red/90 text-white font-medium text-sm sm:text-base disabled:opacity-50 rounded-md"
            >
              Stop Streaming
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import {
  Camera,
  Video,
  Square,
  AlertCircle,
  FolderOpen,
} from 'lucide-vue-next'
import { CameraRequest, CameraResponse, CameraStatus } from '@shared/camera'

const selectedCamera = ref('camera1')
const screenshotPath = ref('')
const recordingPath = ref('')
const isRecording = ref(false)
const isStreaming = ref(false)
const currentRecordingSession = ref<string | null>(null)
const currentStreamSession = ref<string | null>(null)
const error = ref<string | null>(null)
const isLoadingStream = ref(true)
const streamUrl = ref<string>('')
const cameras = ref([
  {
    id: 'camera1',
    name: 'Camera 1 (Main Entrance)',
    status: 'active' as const,
    resolution: '1920x1080',
  },
  {
    id: 'camera2',
    name: 'Camera 2 (Side View)',
    status: 'active' as const,
    resolution: '1280x720',
  },
  {
    id: 'camera3',
    name: 'Camera 3 (Rear View)',
    status: 'inactive' as const,
    resolution: '1920x1080',
  },
])

const streamImgRef = ref<HTMLImageElement>()

const selectedCameraName = computed(() => {
  return cameras.value.find((c) => c.id === selectedCamera.value)?.name || 'Camera 1 (Main Entrance)'
})

const selectScreenshotDirectory = async () => {
  try {
    // Use directory input for browser compatibility
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.style.display = 'none'
    input.accept = '*/*'

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        // Get the directory path from the first file
        const firstFile = files[0]
        const pathParts = firstFile.webkitRelativePath.split('/')
        pathParts.pop() // Remove filename to get directory path
        const directoryPath = pathParts.join('/')
        screenshotPath.value = directoryPath || firstFile.webkitRelativePath.split('/')[0]
        error.value = null // Clear any previous errors
      }
    }

    input.onerror = () => {
      error.value = 'Failed to access directory. Please try again.'
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  } catch (error) {
    console.error('Error selecting screenshot directory:', error)
    error.value = 'Failed to select directory. Please try again.'
  }
}

const selectRecordingDirectory = async () => {
  try {
    // Use directory input for browser compatibility
    const input = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true
    input.style.display = 'none'
    input.accept = '*/*'

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        // Get the directory path from the first file
        const firstFile = files[0]
        const pathParts = firstFile.webkitRelativePath.split('/')
        pathParts.pop() // Remove filename to get directory path
        const directoryPath = pathParts.join('/')
        recordingPath.value = directoryPath || firstFile.webkitRelativePath.split('/')[0]
        error.value = null // Clear any previous errors
      }
    }

    input.onerror = () => {
      error.value = 'Failed to access directory. Please try again.'
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  } catch (error) {
    console.error('Error selecting recording directory:', error)
    error.value = 'Failed to select directory. Please try again.'
  }
}


const initializeBackendStream = async () => {
  try {
    isLoadingStream.value = true
    error.value = null
    await fetchCameraStream()
  } catch (error) {
    console.error('Error initializing backend stream:', error)
    error.value = 'Failed to initialize camera stream from backend.'
  } finally {
    isLoadingStream.value = false
  }
}

const fetchCameraStream = async () => {
  try {
    isLoadingStream.value = true
    error.value = null

    const response = await fetch(`/api/camera/${selectedCamera.value}/stream`)
    const data: CameraResponse = await response.json()

    if (data.success && data.data?.streamUrl) {
      streamUrl.value = data.data.streamUrl
    } else {
      streamUrl.value = `/api/camera/${selectedCamera.value}/live-feed`
    }
  } catch (error) {
    console.error('Error fetching camera stream:', error)
    error.value = 'Failed to fetch camera stream from backend.'
    streamUrl.value = `/api/camera/${selectedCamera.value}/live-feed`
  } finally {
    isLoadingStream.value = false
  }
}

const fetchCameraStatus = async () => {
  try {
    const response = await fetch('/api/camera/status')
    const data: CameraResponse = await response.json()
    if (data.success && data.data) {
      cameras.value = data.data.cameras
      isRecording.value = data.data.isRecording
      isStreaming.value = data.data.isStreaming
    }
  } catch (error) {
    console.error('Error fetching camera status:', error)
  }
}

const handleScreenshot = async () => {
  if (!screenshotPath.value) {
    error.value = 'Please select a save directory for screenshots first.'
    return
  }

  try {
    const request: CameraRequest = {
      path: screenshotPath.value,
      cameraId: selectedCamera.value,
    }

    const response = await fetch('/api/camera/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: CameraResponse = await response.json()
    if (data.success) {
      console.log('Screenshot taken:', data.data)
      alert(`Screenshot saved to: ${screenshotPath.value}/${data.data.filename}`)
      error.value = null
    }
  } catch (error) {
    console.error('Error taking screenshot:', error)
    error.value = 'Failed to take screenshot. Please try again.'
  }
}

const handleStartRecording = async () => {
  if (!recordingPath.value) {
    error.value = 'Please select a save directory for recordings first.'
    return
  }

  try {
    const request: CameraRequest = {
      path: recordingPath.value,
      cameraId: selectedCamera.value,
    }

    const response = await fetch('/api/camera/start-recording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: CameraResponse = await response.json()
    if (data.success) {
      isRecording.value = true
      currentRecordingSession.value = data.data.sessionId
      console.log('Recording started:', data.data)
      error.value = null
    }
  } catch (error) {
    console.error('Error starting recording:', error)
    error.value = 'Failed to start recording. Please try again.'
  }
}

const handleStopRecording = async () => {
  try {
    if (!currentRecordingSession.value) {
      throw new Error('No active recording session')
    }

    const request: CameraRequest = {
      sessionId: currentRecordingSession.value,
    }

    const response = await fetch('/api/camera/stop-recording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: CameraResponse = await response.json()
    if (data.success) {
      isRecording.value = false
      currentRecordingSession.value = null
      console.log('Recording stopped:', data.data)
      error.value = null
    }
  } catch (error) {
    console.error('Error stopping recording:', error)
    error.value = 'Failed to stop recording. Please try again.'
  }
}

const handleStartStreaming = async () => {
  try {
    const request: CameraRequest = {
      cameraId: selectedCamera.value,
    }

    const response = await fetch('/api/camera/start-streaming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: CameraResponse = await response.json()
    if (data.success) {
      isStreaming.value = true
      currentStreamSession.value = data.data.streamId
      console.log('Streaming started:', data.data)
      error.value = null
    }
  } catch (error) {
    console.error('Error starting streaming:', error)
    error.value = 'Failed to start streaming. Please try again.'
  }
}

const handleStopStreaming = async () => {
  try {
    if (!currentStreamSession.value) {
      throw new Error('No active streaming session')
    }

    const request: CameraRequest = {
      streamId: currentStreamSession.value,
    }

    const response = await fetch('/api/camera/stop-streaming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: CameraResponse = await response.json()
    if (data.success) {
      isStreaming.value = false
      currentStreamSession.value = null
      console.log('Streaming stopped:', data.data)
      error.value = null
    }
  } catch (error) {
    console.error('Error stopping streaming:', error)
    error.value = 'Failed to stop streaming. Please try again.'
  }
}

const handleCameraChange = async () => {
  // Stream will update automatically via watcher
}

const onStreamError = () => {
  error.value = 'Failed to load camera stream from backend'
}

const onStreamLoad = () => {
  error.value = null
}

// Watchers
watch(selectedCamera, () => {
  fetchCameraStream()
})

// Lifecycle
onMounted(() => {
  fetchCameraStatus()
  initializeBackendStream()
})
</script>
