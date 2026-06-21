import { Camera, CameraOff, CircleGauge, Sparkles, Wind } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_STORY_MOTION_CONTROLS } from '../story-scene/storyMotionControls';

const VISION_TASKS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
const DETECT_INTERVAL_MS = 70;
const EMIT_INTERVAL_MS = 120;

export const DEFAULT_STORY_CAMERA_CONTROLS = DEFAULT_STORY_MOTION_CONTROLS;

function StoryCameraController({ onControlsChange, onInteractionChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const runningRef = useRef(false);
  const modelsRef = useRef({ pose: null, hand: null, face: null });
  const previousFrameRef = useRef(null);
  const smoothedRef = useRef(DEFAULT_STORY_CAMERA_CONTROLS);
  const lastDetectRef = useRef(0);
  const lastEmitRef = useRef(0);
  const detectionErrorsRef = useRef(0);

  const [cameraState, setCameraState] = useState('idle');
  const [statusText, setStatusText] = useState('摄像头未开启');
  const [readout, setReadout] = useState(DEFAULT_STORY_CAMERA_CONTROLS);

  useEffect(() => {
    onControlsChange?.(DEFAULT_STORY_CAMERA_CONTROLS);
    onInteractionChange?.(null);
    return () => {
      stopStream();
      cancelAnimationFrame(frameRef.current);
      modelsRef.current.pose?.close?.();
      modelsRef.current.hand?.close?.();
      modelsRef.current.face?.close?.();
    };
  }, [onControlsChange, onInteractionChange]);

  async function startCamera() {
    let stream = null;
    try {
      stopCameraResources();
      setCameraState('loading');
      setStatusText('正在连接本地识别');
      const [{ FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker }, nextStream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user',
          },
          audio: false,
        }),
      ]);
      stream = nextStream;
      const resolver = await FilesetResolver.forVisionTasks(VISION_TASKS_URL);
      const [pose, hand, face] = await Promise.all([
        createPoseLandmarker(PoseLandmarker, resolver),
        createHandLandmarker(HandLandmarker, resolver),
        createFaceLandmarker(FaceLandmarker, resolver),
      ]);
      if (!pose && !hand && !face) {
        throw new Error('MediaPipe models could not be loaded.');
      }
      modelsRef.current = { pose, hand, face };
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await safePlayVideo(videoRef.current);
      }
      runningRef.current = true;
      detectionErrorsRef.current = 0;
      setCameraState('ready');
      setStatusText(createModelStatus(modelsRef.current));
      detectFrame();
    } catch (error) {
      if (!isExpectedCameraError(error)) {
        console.error(error);
      }
      stream?.getTracks().forEach((track) => track.stop());
      stopCameraResources();
      setCameraState('blocked');
      setStatusText(createCameraErrorText(error));
      onControlsChange?.(DEFAULT_STORY_CAMERA_CONTROLS);
      onInteractionChange?.(null);
    }
  }

  function stopCamera() {
    stopCameraResources();
    previousFrameRef.current = null;
    smoothedRef.current = DEFAULT_STORY_CAMERA_CONTROLS;
    setReadout(DEFAULT_STORY_CAMERA_CONTROLS);
    setCameraState('idle');
    setStatusText('摄像头已关闭');
    onControlsChange?.(DEFAULT_STORY_CAMERA_CONTROLS);
    onInteractionChange?.(null);
  }

  function stopCameraResources() {
    runningRef.current = false;
    cancelAnimationFrame(frameRef.current);
    stopStream();
    Object.values(modelsRef.current).forEach((model) => model?.close?.());
    modelsRef.current = { pose: null, hand: null, face: null };
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function detectFrame(now = performance.now()) {
    const video = videoRef.current;
    if (!video || !runningRef.current) return;

    if (video.readyState >= 2 && now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
      lastDetectRef.current = now;
      try {
        const models = modelsRef.current;
        const poseResult = models.pose?.detectForVideo(video, now);
        const handResult = models.hand?.detectForVideo(video, now);
        const faceResult = models.face?.detectForVideo(video, now);
        const frame = normalizeFrame(poseResult, handResult, faceResult);
        const estimated = estimateControls(frame, previousFrameRef.current);
        previousFrameRef.current = frame;
        const smoothed = smoothControls(smoothedRef.current, estimated, 0.12);
        smoothedRef.current = smoothed;
        detectionErrorsRef.current = 0;

        if (now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
          lastEmitRef.current = now;
          onControlsChange?.(smoothed);
          onInteractionChange?.(createInteractionState(frame, smoothed, now));
          setReadout(smoothed);
          setStatusText(createStatusText(frame, smoothed));
        }
      } catch (error) {
        detectionErrorsRef.current += 1;
        if (detectionErrorsRef.current === 1) {
          console.warn('Story camera detection skipped:', error);
        }
        if (detectionErrorsRef.current >= 8) {
          setStatusText('识别暂时停顿，正在恢复');
          previousFrameRef.current = null;
          detectionErrorsRef.current = 0;
        }
      }
    }

    frameRef.current = requestAnimationFrame(detectFrame);
  }

  return (
    <div className={`story-camera-control camera-${cameraState}`}>
      <div className="story-camera-preview">
        <video ref={videoRef} playsInline muted autoPlay aria-hidden="true" />
        {cameraState !== 'ready' ? (
          <div className="story-camera-placeholder" aria-hidden="true">
            <Camera size={18} />
            <span>Camera</span>
          </div>
        ) : null}
      </div>
      <div className="story-camera-readout">
        <p>{statusText}</p>
        <div>
          <span style={{ '--level': readout.windStrength }}>
            <Wind size={14} />
            风
          </span>
          <span style={{ '--level': readout.sparkleDensity }}>
            <Sparkles size={14} />
            光
          </span>
          <span style={{ '--level': readout.cameraPush }}>
            <Camera size={14} />
            靠近
          </span>
          <span style={{ '--level': readout.calmLevel }}>
            <CircleGauge size={14} />
            安静
          </span>
        </div>
      </div>
      {cameraState === 'ready' ? (
        <button className="story-stage-camera-button" type="button" onClick={stopCamera}>
          <CameraOff size={18} />
          关闭摄像头
        </button>
      ) : (
        <button className="story-stage-camera-button" type="button" onClick={startCamera} disabled={cameraState === 'loading'}>
          <Camera size={18} />
          {cameraState === 'loading' ? '连接中' : '开启摄像头驱动'}
        </button>
      )}
    </div>
  );
}

async function createPoseLandmarker(PoseLandmarker, resolver) {
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await PoseLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.38,
        minPosePresenceConfidence: 0.38,
        minTrackingConfidence: 0.45,
      });
    } catch (error) {
      console.warn('Pose landmarker unavailable:', error);
    }
  }
  return null;
}

async function createHandLandmarker(HandLandmarker, resolver) {
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await HandLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.34,
        minHandPresenceConfidence: 0.34,
        minTrackingConfidence: 0.42,
      });
    } catch (error) {
      console.warn('Hand landmarker unavailable:', error);
    }
  }
  return null;
}

async function createFaceLandmarker(FaceLandmarker, resolver) {
  for (const delegate of ['GPU', 'CPU']) {
    try {
      return await FaceLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.38,
        minFacePresenceConfidence: 0.38,
        minTrackingConfidence: 0.45,
      });
    } catch (error) {
      console.warn('Face landmarker unavailable:', error);
    }
  }
  return null;
}

function normalizeFrame(poseResult, handResult, faceResult) {
  const pose = poseResult?.landmarks?.[0] || null;
  const hands = (handResult?.landmarks || []).map((landmarks, index) => {
    const handedness = handResult?.handedness?.[index]?.[0];
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const middleTip = landmarks[12];
    return {
      center: averagePoint([wrist, indexMcp, pinkyMcp, middleTip]),
      wrist,
      label: handedness?.categoryName || `hand-${index}`,
      score: handedness?.score || 0.72,
    };
  });
  const blendshapes = faceResult?.faceBlendshapes?.[0]?.categories || [];
  const face = faceResult?.faceLandmarks?.[0] || null;
  return { pose, hands, blendshapes, face };
}

function createInteractionState(frame, controls, timestamp) {
  const hands = frame.hands.map((hand) => ({
    x: clamp(1 - hand.center.x, 0, 1),
    y: clamp(hand.center.y, 0, 1),
    label: hand.label,
    score: hand.score,
  }));
  const mouthPoint = frame.face?.[13] || frame.face?.[0] || null;
  const mouth = mouthPoint
    ? { x: clamp(1 - mouthPoint.x, 0, 1), y: clamp(mouthPoint.y, 0, 1) }
    : null;
  const handSpread = hands.length > 1 ? distance(hands[0], hands[1]) : 0;
  return {
    timestamp,
    hands,
    mouth,
    handSpread,
    raised: hands.some((hand) => hand.y < 0.46),
    energy: controls.windStrength,
  };
}

function estimateControls(frame, previous) {
  const handControls = estimateHandControls(frame.hands, previous?.hands || []);
  const poseControls = estimatePoseControls(frame.pose, previous?.pose || null);
  const faceControls = estimateFaceControls(frame.blendshapes);
  const hasHands = frame.hands.length > 0;
  const hasPose = Boolean(frame.pose);
  const source = hasHands ? handControls : (hasPose ? poseControls : DEFAULT_STORY_CAMERA_CONTROLS);

  return {
    windStrength: clamp(Math.max(source.windStrength, poseControls.windStrength * 0.55), 0, 1),
    windDirection: clamp(source.windDirection || poseControls.windDirection || 0, -1, 1),
    windGust: clamp(Math.max(source.windStrength, poseControls.windStrength) * 0.92, 0, 1),
    rainAmount: clamp(source.rainAmount + faceControls.rainAmount, 0, 0.72),
    sunWarmth: clamp(Math.max(source.sunWarmth, faceControls.sunWarmth), 0, 1),
    sparkleDensity: clamp(Math.max(source.sparkleDensity, faceControls.sparkleDensity), 0, 1),
    flowerBloom: clamp(Math.max(source.flowerBloom, faceControls.flowerBloom), 0, 1),
    calmLevel: clamp(Math.max(source.calmLevel, faceControls.calmLevel), 0, 1),
    cameraPush: clamp(Math.max(source.cameraPush || 0, poseControls.cameraPush || 0), 0, 1),
    cameraBreath: clamp(0.22 + Math.max(source.calmLevel, faceControls.calmLevel) * 0.56, 0, 1),
    cloudAmount: clamp(
      0.56 + (source.rainAmount + faceControls.rainAmount) * 0.48 - Math.max(source.windStrength, poseControls.windStrength) * 0.62,
      0.04,
      0.96,
    ),
  };
}

function estimateHandControls(hands, previousHands) {
  if (!hands.length) return DEFAULT_STORY_CAMERA_CONTROLS;
  const motion = getHandMotion(hands, previousHands);
  const travel = getDominantHandTravel(hands, previousHands);
  const first = hands[0];
  const second = hands[1];
  const handCount = hands.length;
  const closeHands = second ? distance(first.center, second.center) < 0.24 : false;
  const raised = hands.some((hand) => hand.center.y < 0.48 || hand.wrist.y < 0.5);
  const stillness = clamp(1 - motion * 22, 0, 1);
  const quality = hands.reduce((sum, hand) => sum + hand.score, 0) / handCount;

  return {
    windStrength: clamp((motion * 13 + Math.abs(travel.x) * 9 + (handCount === 1 ? 0.16 : 0.04)) * quality, 0, 1),
    windDirection: clamp(travel.x * 9 || (first.center.x - 0.5) * 1.8, -1, 1),
    rainAmount: clamp((1 - stillness) * 0.18 - (closeHands ? 0.08 : 0), 0, 0.42),
    sunWarmth: clamp((raised ? 0.78 : 0.42) + (closeHands ? 0.18 : 0), 0, 1),
    sparkleDensity: clamp((closeHands ? 0.84 : 0.36) + (raised ? 0.12 : 0), 0, 1),
    flowerBloom: clamp(closeHands ? 0.86 : 0.48, 0, 1),
    calmLevel: clamp(stillness * 0.78 + (closeHands ? 0.16 : 0), 0, 1),
    cameraPush: 0.08,
  };
}

function estimatePoseControls(pose, previousPose) {
  if (!pose?.length) return DEFAULT_STORY_CAMERA_CONTROLS;
  const leftShoulder = pose[11];
  const rightShoulder = pose[12];
  const leftWrist = pose[15];
  const rightWrist = pose[16];
  const visibility = averageVisibility([leftShoulder, rightShoulder, leftWrist, rightWrist]);
  const motion = previousPose ? averageMotion(pose, previousPose) : 0.02;
  const stillness = clamp(1 - motion * 16, 0, 1);
  const shoulderCenter = midpoint(leftShoulder, rightShoulder);
  const handCenter = midpoint(leftWrist, rightWrist);
  const leftRaised = leftWrist.y < leftShoulder.y - 0.035;
  const rightRaised = rightWrist.y < rightShoulder.y - 0.035;
  const travel = previousPose ? wristTravel(pose, previousPose) : { x: 0, y: 0, amount: 0 };
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  const previousShoulderWidth = previousPose?.length ? distance(previousPose[11], previousPose[12]) : shoulderWidth;
  const forwardMotion = clamp((shoulderWidth - previousShoulderWidth) * 18, 0, 1);
  const armsOpen = distance(leftWrist, rightWrist) > shoulderWidth * 2.45;

  return {
    windStrength: clamp((Math.abs(travel.x) * 10 + motion * 6 + (armsOpen ? 0.34 : 0)) * visibility, 0, 1),
    windDirection: clamp((travel.x || handCenter.x - shoulderCenter.x) * 4.2, -1, 1),
    rainAmount: clamp((1 - stillness) * 0.12, 0, 0.34),
    sunWarmth: clamp((leftRaised || rightRaised ? 0.76 : 0.42) * visibility, 0, 1),
    sparkleDensity: clamp((leftRaised && rightRaised ? 0.72 : 0.36) * visibility, 0, 1),
    flowerBloom: clamp((leftRaised && rightRaised ? 0.7 : 0.46) * visibility, 0, 1),
    calmLevel: clamp(stillness * 0.84, 0, 1),
    cameraPush: clamp(0.08 + forwardMotion * visibility, 0, 1),
  };
}

function estimateFaceControls(blendshapes) {
  const smile = (scoreBlendshape(blendshapes, 'mouthSmileLeft') + scoreBlendshape(blendshapes, 'mouthSmileRight')) / 2;
  const browDown = (scoreBlendshape(blendshapes, 'browDownLeft') + scoreBlendshape(blendshapes, 'browDownRight')) / 2;
  const eyeSquint = (scoreBlendshape(blendshapes, 'eyeSquintLeft') + scoreBlendshape(blendshapes, 'eyeSquintRight')) / 2;
  if (!blendshapes.length) {
    return {
      rainAmount: 0,
      sunWarmth: 0.42,
      sparkleDensity: 0.36,
      flowerBloom: 0.46,
      calmLevel: 0.62,
    };
  }
  return {
    rainAmount: clamp(browDown * 0.22, 0, 0.32),
    sunWarmth: clamp(0.36 + smile * 0.82, 0, 1),
    sparkleDensity: clamp(0.32 + smile * 0.78 + eyeSquint * 0.12, 0, 1),
    flowerBloom: clamp(0.42 + smile * 0.52, 0, 1),
    calmLevel: clamp(0.58 + smile * 0.2 - browDown * 0.18, 0, 1),
  };
}

function createStatusText(frame, controls) {
  if (!frame.hands.length && !frame.pose && !frame.blendshapes.length) return '还没有看清动作';
  if (controls.cameraPush > 0.46) return '靠近时，花园也轻轻靠近';
  if (controls.windStrength > 0.58) return '风正在跟着手移动';
  if (controls.sunWarmth > 0.72) return '暖光正在升起';
  if (controls.sparkleDensity > 0.68) return '光点变多了';
  if (controls.calmLevel > 0.78) return '画面正在慢下来';
  return '摄像头正在驱动画面';
}

function getHandMotion(hands, previousHands) {
  if (!previousHands.length) return 0.02;
  const motions = hands.map((hand) => {
    const previous = findPreviousHand(hand, previousHands);
    return previous ? distance(hand.center, previous.center) : 0.03;
  });
  return motions.reduce((sum, item) => sum + item, 0) / Math.max(1, motions.length);
}

function getDominantHandTravel(hands, previousHands) {
  let best = { x: 0, y: 0, amount: 0 };
  hands.forEach((hand) => {
    const previous = findPreviousHand(hand, previousHands);
    if (!previous) return;
    const x = hand.center.x - previous.center.x;
    const y = hand.center.y - previous.center.y;
    const amount = Math.hypot(x, y);
    if (amount > best.amount) best = { x, y, amount };
  });
  return best;
}

function findPreviousHand(hand, previousHands) {
  return previousHands.find((item) => item.label === hand.label) || previousHands[0];
}

function smoothControls(current, target, amount) {
  return {
    windStrength: lerp(current.windStrength, target.windStrength, amount),
    windDirection: lerp(current.windDirection, target.windDirection, amount * 0.75),
    windGust: lerp(current.windGust, target.windGust, amount),
    cloudAmount: lerp(current.cloudAmount, target.cloudAmount, amount),
    rainAmount: lerp(current.rainAmount, target.rainAmount, amount),
    sunWarmth: lerp(current.sunWarmth, target.sunWarmth, amount),
    sparkleDensity: lerp(current.sparkleDensity, target.sparkleDensity, amount),
    flowerBloom: lerp(current.flowerBloom, target.flowerBloom, amount),
    calmLevel: lerp(current.calmLevel, target.calmLevel, amount),
    cameraPush: lerp(current.cameraPush, target.cameraPush, amount * 0.7),
    cameraBreath: lerp(current.cameraBreath, target.cameraBreath, amount * 0.5),
  };
}

function createModelStatus(models) {
  const sources = [
    models.pose ? '姿势' : '',
    models.hand ? '手势' : '',
    models.face ? '表情' : '',
  ].filter(Boolean);
  return `${sources.join('、')}已在本地连接`;
}

function createCameraErrorText(error) {
  if (!window.isSecureContext) return '请使用 localhost 或 HTTPS 打开摄像头';
  if (error?.name === 'NotAllowedError') return '摄像头权限未允许';
  if (error?.name === 'NotFoundError') return '没有找到可用摄像头';
  if (error?.name === 'NotReadableError') return '摄像头正被其他应用占用';
  return '本地识别没有连接成功';
}

function isExpectedCameraError(error) {
  return ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'AbortError'].includes(error?.name);
}

function safePlayVideo(video) {
  const playPromise = video.play();
  if (!playPromise?.then) return Promise.resolve();
  return Promise.race([
    playPromise.catch(() => {}),
    new Promise((resolve) => window.setTimeout(resolve, 1200)),
  ]);
}

function averagePoint(points) {
  const valid = points.filter(Boolean);
  return {
    x: valid.reduce((sum, point) => sum + point.x, 0) / valid.length,
    y: valid.reduce((sum, point) => sum + point.y, 0) / valid.length,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function wristTravel(current, previous) {
  const left = {
    x: current[15].x - previous[15].x,
    y: current[15].y - previous[15].y,
  };
  const right = {
    x: current[16].x - previous[16].x,
    y: current[16].y - previous[16].y,
  };
  const chosen = Math.hypot(left.x, left.y) > Math.hypot(right.x, right.y) ? left : right;
  return {
    ...chosen,
    amount: Math.hypot(chosen.x, chosen.y),
  };
}

function averageMotion(current, previous) {
  const indexes = [11, 12, 13, 14, 15, 16];
  const total = indexes.reduce((sum, index) => sum + distance(current[index], previous[index]), 0);
  return total / indexes.length;
}

function averageVisibility(points) {
  const total = points.reduce((sum, point) => sum + (Number.isFinite(point.visibility) ? point.visibility : 0.72), 0);
  return total / points.length;
}

function scoreBlendshape(blendshapes, name) {
  return blendshapes.find((item) => item.categoryName === name)?.score || 0;
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default StoryCameraController;
