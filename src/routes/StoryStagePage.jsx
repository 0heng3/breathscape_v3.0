import { ArrowLeft, CloudRain, Download, RotateCcw, Sparkles, Wind } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import StoryCameraController, { DEFAULT_STORY_CAMERA_CONTROLS } from '../components/StoryCameraController';
import StoryDynamicOverlay from '../components/StoryDynamicOverlay';

function StoryStagePage({ stageJob, onBack, onRestart }) {
  const imageRef = useRef(null);
  const frameRef = useRef(null);
  const [imageRect, setImageRect] = useState(null);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [intensity, setIntensity] = useState(0.72);
  const [cameraControls, setCameraControls] = useState(DEFAULT_STORY_CAMERA_CONTROLS);

  const imageUrl = useMemo(() => normalizeGeneratedUrl(stageJob?.imageUrl), [stageJob?.imageUrl]);
  const mood = stageJob?.mood || 'calm';
  const prompt = stageJob?.prompt || '';

  useEffect(() => {
    function measure() {
      const image = imageRef.current;
      const frame = frameRef.current;
      if (!image || !frame || !image.complete || !image.naturalWidth || !image.naturalHeight) return;
      const frameBox = frame.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      setImageRect({
        left: imageBox.left - frameBox.left,
        top: imageBox.top - frameBox.top,
        width: imageBox.width,
        height: imageBox.height,
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
        <div className="story-stage-frame" ref={frameRef}>
          <img
            ref={imageRef}
            src={imageUrl}
            alt="生成后的 3D 故事场景大图"
            onLoad={() => {
              window.requestAnimationFrame(() => {
                const image = imageRef.current;
                const frame = frameRef.current;
                if (!image || !frame) return;
                const frameBox = frame.getBoundingClientRect();
                const imageBox = image.getBoundingClientRect();
                setImageRect({
                  left: imageBox.left - frameBox.left,
                  top: imageBox.top - frameBox.top,
                  width: imageBox.width,
                  height: imageBox.height,
                });
              });
            }}
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
              <StoryDynamicOverlay intensity={intensity} mood={mood} controls={cameraControls} />
            </div>
          ) : null}
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
          </div>
          <StoryCameraController onControlsChange={setCameraControls} />
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
