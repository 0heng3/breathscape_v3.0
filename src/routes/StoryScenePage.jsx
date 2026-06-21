import { ArrowLeft, Brush, Eraser, ImagePlus, RotateCcw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import StorySketchCanvas from '../components/StorySketchCanvas';
import { estimateRecognizedElements } from '../story-scene/sketchExport';
import { pollStorySceneJob, submitStorySceneJob } from '../story-scene/storySceneApi';

const STYLE_PRESETS = [
  { id: 'storybook_3d', label: '故事书 3D' },
  { id: 'clay_watercolor', label: '黏土水彩' },
  { id: 'warm_garden', label: '温暖花园' },
];

const PROVIDERS = [
  { id: 'newapi', label: 'NewAPI' },
  { id: 'yunwu', label: 'Yunwu' },
  { id: 'mock', label: 'Mock' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'replicate', label: 'ControlNet' },
  { id: 'comfyui', label: 'ComfyUI' },
];

function StoryScenePage({ onBack, onOpenStage }) {
  const canvasRef = useRef(null);
  const [sketch, setSketch] = useState({ strokes: [], width: 960, height: 640 });
  const [brushSize, setBrushSize] = useState(8);
  const [mode, setMode] = useState('draw');
  const [stylePreset, setStylePreset] = useState('storybook_3d');
  const [provider, setProvider] = useState('newapi');
  const [mood, setMood] = useState('calm');
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sourceImage, setSourceImage] = useState('');

  const recognizedElements = useMemo(() => estimateRecognizedElements(sketch.strokes), [sketch]);
  const canGenerate = sketch.strokes.length > 0 && status !== 'generating';
  const resultImage = normalizeImageUrl(job?.imageUrl);

  async function generateScene(override = {}) {
    const currentSketch = canvasRef.current?.getSketch();
    if (!currentSketch?.strokes?.length) {
      setError('先画一点内容，再生成故事场景。');
      return;
    }
    setError('');
    setStatus('generating');
    setJob(null);
    try {
      const nextStylePreset = override.stylePreset || stylePreset;
      const submitted = await submitStorySceneJob({
        sketch: currentSketch,
        recognizedElements: estimateRecognizedElements(currentSketch.strokes),
        mood,
        stylePreset: nextStylePreset,
        provider,
      });
      setSourceImage(submitted.drawingPng);
      setJob(submitted);
      const done = await pollStorySceneJob(submitted.jobId, (nextJob) => setJob((current) => ({ ...current, ...nextJob })));
      setStatus(done?.status === 'done' ? 'done' : 'error');
      if (done?.status !== 'done') {
        setError(done?.error || '生成没有完成，请检查后端服务。');
        return;
      }
      onOpenStage?.({
        ...submitted,
        ...done,
        sourceImage: submitted.drawingPng,
        controlScribblePng: submitted.controlScribblePng,
        mood,
        stylePreset: nextStylePreset,
        provider,
      });
    } catch (reason) {
      setStatus('error');
      setError(reason.message || '生成请求失败。');
    }
  }

  function clearSketch() {
    canvasRef.current?.clear();
    setJob(null);
    setSourceImage('');
    setStatus('idle');
    setError('');
  }

  function undoSketch() {
    canvasRef.current?.undo();
    setStatus('idle');
    setError('');
  }

  return (
    <section className="screen story-scene-page page-enter">
      <div className="story-scene-toolbar">
        <button className="story-icon-button" onClick={onBack} aria-label="返回">
          <ArrowLeft size={22} />
        </button>
        <div className="story-scene-title">
          <p className="eyebrow">Sketch to Story</p>
          <h2>把儿童画变成 3D 故事场景</h2>
        </div>
        <button className="story-generate-button" onClick={() => generateScene()} disabled={!canGenerate}>
          <ImagePlus size={21} />
          {status === 'generating' ? '生成中' : '生成故事场景'}
        </button>
      </div>

      <div className="story-scene-layout">
        <div className="story-canvas-panel">
          <div className="story-canvas-actions">
            <div className="story-segment">
              <button className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')} aria-label="画笔">
                <Brush size={18} />
              </button>
              <button className={mode === 'erase' ? 'active' : ''} onClick={() => setMode('erase')} aria-label="橡皮">
                <Eraser size={18} />
              </button>
            </div>
            <label className="story-slider">
              <span>粗细</span>
              <input type="range" min="3" max="22" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
            </label>
            <button className="story-icon-button" onClick={undoSketch} aria-label="撤销">
              <RotateCcw size={18} />
            </button>
            <button className="story-icon-button" onClick={clearSketch} aria-label="清空">
              <Trash2 size={18} />
            </button>
          </div>
          <StorySketchCanvas ref={canvasRef} brushSize={brushSize} mode={mode} onChange={setSketch} />
        </div>

        <aside className="story-side-panel">
          <div className="story-control-block">
            <span>生成服务</span>
            <div className="story-chip-grid">
              {PROVIDERS.map((item) => (
                <button key={item.id} className={provider === item.id ? 'active' : ''} onClick={() => setProvider(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="story-control-block">
            <span>画面风格</span>
            <div className="story-chip-grid">
              {STYLE_PRESETS.map((item) => (
                <button key={item.id} className={stylePreset === item.id ? 'active' : ''} onClick={() => setStylePreset(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="story-control-block">
            <span>情绪氛围</span>
            <select value={mood} onChange={(event) => setMood(event.target.value)}>
              <option value="calm">安静</option>
              <option value="happy">开心</option>
              <option value="sad">难过</option>
              <option value="angry">生气</option>
              <option value="scared">害怕</option>
            </select>
          </div>

          <div className="story-control-block">
            <span>识别线索</span>
            <p>{recognizedElements.join('、') || '等待绘画'}</p>
          </div>

          <div className="story-before-after">
            <div>
              <span>原始草图</span>
              {sourceImage ? <img src={sourceImage} alt="儿童原始草图" /> : <div className="story-empty-thumb">等待生成</div>}
            </div>
            <div>
              <span>故事场景</span>
              {resultImage ? <img src={resultImage} alt="生成后的 3D 故事场景" /> : <div className="story-empty-thumb">{status === 'generating' ? '生成中' : '暂无结果'}</div>}
            </div>
          </div>

          {resultImage ? (
            <button className="story-open-stage-button" onClick={() => onOpenStage?.({ ...job, imageUrl: resultImage, sourceImage, mood, stylePreset, provider })}>
              <Sparkles size={17} />
              进入故事舞台
            </button>
          ) : null}

          <div className="story-variant-row">
            <button onClick={() => generateScene({ stylePreset: 'storybook_3d' })} disabled={!canGenerate}>
              <Wand2 size={16} />
              更像原画
            </button>
            <button onClick={() => generateScene({ stylePreset: 'clay_watercolor' })} disabled={!canGenerate}>
              <Sparkles size={16} />
              更梦幻
            </button>
          </div>

          {job?.prompt ? <p className="story-prompt-preview">{job.prompt}</p> : null}
          {job?.transientError ? <p className="story-status-note">{job.transientError}</p> : null}
          {error ? <p className="story-error">{error}</p> : null}
        </aside>
      </div>
    </section>
  );
}

function normalizeImageUrl(imageUrl) {
  if (!imageUrl || typeof window === 'undefined') return imageUrl || '';
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) return imageUrl;
  if (window.location.port === '4173' && imageUrl.startsWith('/generated')) {
    return `http://127.0.0.1:3008${imageUrl}`;
  }
  return imageUrl;
}

export default StoryScenePage;
