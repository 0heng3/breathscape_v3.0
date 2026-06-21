import {
  ArrowLeft,
  CircleGauge,
  Cloud,
  CloudRain,
  Download,
  Hand,
  RotateCcw,
  Smile,
  Sparkles,
  Wind,
  ZoomIn,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import StoryCameraController from '../components/StoryCameraController';
import StoryDynamicOverlay from '../components/StoryDynamicOverlay';
import {
  buildStorySceneProfile,
  DEFAULT_STORY_MOTION_CONTROLS,
  STORY_DEBUG_ACTIONS,
} from '../story-scene/storyMotionControls';

const DEBUG_ACTION_ICONS = {
  blow: Wind,
  raise: Hand,
  smile: Smile,
  rain: CloudRain,
  calm: CircleGauge,
  closer: ZoomIn,
};

function StoryStagePage({ stageJob, onBack, onRestart }) {
  const imageRef = useRef(null);
  const frameRef = useRef(null);
  const debugTimerRef = useRef(null);
  const [imageRect, setImageRect] = useState(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [intensity, setIntensity] = useState(0.72);
  const [cameraControls, setCameraControls] = useState(DEFAULT_STORY_MOTION_CONTROLS);
  const [cameraInteraction, setCameraInteraction] = useState(null);
  const [debugAction, setDebugAction] = useState(null);

  const imageUrl = useMemo(() => normalizeGeneratedUrl(stageJob?.imageUrl), [stageJob?.imageUrl]);
  const mood = stageJob?.mood || 'calm';
  const prompt = stageJob?.prompt || '';
  const sceneProfile = useMemo(() => buildStorySceneProfile(stageJob), [stageJob]);
  const activeDebugAction = STORY_DEBUG_ACTIONS.find((item) => item.id === debugAction?.id);
  const stageMotionStyle = {
    '--story-camera-scale': 1 + cameraControls.cameraPush * 0.035,
    '--story-breath-scale': cameraControls.cameraBreath * 0.004,
    '--story-breath-duration': `${4.6 + cameraControls.calmLevel * 2.4}s`,
  };

  useEffect(() => {
    function measure() {
      const image = imageRef.current;
      const frame = frameRef.current;
      if (!image || !frame || !image.complete || !image.naturalWidth || !image.naturalHeight) return;
      setImageRect({
        left: image.offsetLeft,
        top: image.offsetTop,
        width: image.offsetWidth,
        height: image.offsetHeight,
      });
    }

    measure();
    const resizeObserver = new ResizeObserver(measure);
    if (frameRef.current) resizeObserver.observe(frameRef.current);
    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [imageUrl]);

  useEffect(() => () => window.clearTimeout(debugTimerRef.current), []);

  function runDebugAction(actionId) {
    const action = STORY_DEBUG_ACTIONS.find((item) => item.id === actionId);
    if (!action) return;
    if (debugAction?.id === actionId) {
      resetDebugAction();
      return;
    }
    window.clearTimeout(debugTimerRef.current);
    setDebugAction({
      id: actionId,
      startedAt: performance.now(),
      sequence: Date.now(),
    });
    debugTimerRef.current = window.setTimeout(resetDebugAction, action.duration);
  }

  function resetDebugAction() {
    window.clearTimeout(debugTimerRef.current);
    setDebugAction(null);
  }

  if (!imageUrl) {
    return (
      <section className="screen story-stage-page page-enter">
        <div className="story-stage-empty">
          <button className="story-icon-button" onClick={onBack} aria-label="返回">
            <ArrowLeft size={22} />
          </button>
          <p>还没有可展示的故事场景。</p>
          <button className="story-generate-button" onClick={onRestart}>
            <RotateCcw size={18} />
            回到绘画
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen story-stage-page page-enter">
      <div className="story-stage-toolbar">
        <button className="story-icon-button" onClick={onBack} aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <div className="story-stage-title">
          <p className="eyebrow">Story Stage</p>
          <h2>故事场景舞台</h2>
        </div>
        <div className="story-stage-actions">
          <button className={overlayEnabled ? 'active' : ''} onClick={() => setOverlayEnabled((value) => !value)}>
            <Sparkles size={17} />
            动态层
          </button>
          <a href={imageUrl} download>
            <Download size={17} />
            保存图
          </a>
        </div>
      </div>

      <div className="story-stage-layout">
        <div className="story-stage-frame">
          <div
            className={`story-stage-visual ${debugAction?.id === 'closer' ? 'story-stage-action-closer' : ''}`}
            ref={frameRef}
            style={stageMotionStyle}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="生成后的 3D 故事场景大图"
              onLoad={() => window.requestAnimationFrame(() => {
                const image = imageRef.current;
                if (!image) return;
                setImageRect({
                  left: image.offsetLeft,
                  top: image.offsetTop,
                  width: image.offsetWidth,
                  height: image.offsetHeight,
                });
              })}
            />
            {overlayEnabled && imageRect ? (
              <div
                className="story-stage-overlay-slot"
                style={{
                  left: `${imageRect.left}px`,
                  top: `${imageRect.top}px`,
                  width: `${imageRect.width}px`,
                  height: `${imageRect.height}px`,
                }}
              >
                <StoryDynamicOverlay
                  intensity={intensity}
                  mood={mood}
                  controls={cameraControls}
                  action={debugAction}
                  sceneProfile={sceneProfile}
                  interaction={cameraInteraction}
                />
              </div>
            ) : null}
          </div>
        </div>

        <aside className="story-stage-panel">
          <div className="story-stage-panel-block">
            <span>动态强度</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={intensity}
              onChange={(event) => setIntensity(Number(event.target.value))}
            />
          </div>
          <StoryCameraController
            onControlsChange={setCameraControls}
            onInteractionChange={setCameraInteraction}
          />
          <div className="story-debug-controls">
            <div className="story-debug-heading">
              <span>动作调试</span>
              <output>{activeDebugAction ? `动作进行中：${activeDebugAction.label}` : '摄像头控制'}</output>
            </div>
            <div className="story-debug-grid">
              {STORY_DEBUG_ACTIONS.map((action) => {
                const Icon = DEBUG_ACTION_ICONS[action.id] || Sparkles;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={debugAction?.id === action.id ? 'active' : ''}
                    aria-pressed={debugAction?.id === action.id}
                    onClick={() => runDebugAction(action.id)}
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                );
              })}
            </div>
            <button className="story-debug-reset" type="button" onClick={resetDebugAction} disabled={!debugAction}>
              <RotateCcw size={15} />
              恢复摄像头控制
            </button>
          </div>
          <div className="story-stage-metrics">
            <div>
              <CloudRain size={17} />
              雨量 {Math.round(cameraControls.rainAmount * 100)}%
            </div>
            <div>
              <Wind size={17} />
              风力 {Math.round(cameraControls.windStrength * 100)}%
            </div>
            <div>
              <Sparkles size={17} />
              光点 {Math.round(cameraControls.sparkleDensity * 100)}%
            </div>
            <div>
              <Cloud size={17} />
              云量 {Math.round(cameraControls.cloudAmount * 100)}%
            </div>
          </div>
          <p className="story-stage-note">
            摄像头只在浏览器本地分析姿势、手势和表情，输出风、雨、光、花草摆动等连续参数；动态层仍按生成图真实显示区域对齐。
          </p>
          {prompt ? <p className="story-prompt-preview">{prompt}</p> : null}
        </aside>
      </div>
    </section>
  );
}

function normalizeGeneratedUrl(imageUrl) {
  if (!imageUrl || typeof window === 'undefined') return imageUrl || '';
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  if (window.location.port === '4173' && imageUrl.startsWith('/generated')) {
    return `http://127.0.0.1:3008${imageUrl}`;
  }
  if (imageUrl.startsWith('/generated')) {
    return imageUrl;
  }
  return imageUrl;
}

export default StoryStagePage;
