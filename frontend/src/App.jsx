import { useState, useEffect } from 'react'
import {
  Zap,
  Image as ImageIcon,
  Download,
  Loader2,
  Settings,
  RefreshCw,
  Maximize2,
  FolderOpen,
  X,
  Sparkles,
  Save,
  Github
} from 'lucide-react'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [modelPath, setModelPath] = useState('')
  const [availableGpus, setAvailableGpus] = useState([])
  const [selectedGpu, setSelectedGpu] = useState(0)
  const [fp8Quantization, setFp8Quantization] = useState(false)
  const [settings, setSettings] = useState({
    steps: 8,
    guidance_scale: 0.0,
    width: 1024,
    height: 1024,
    seed: -1
  })

  const apiBase =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ??
    `${window.location.protocol}//${window.location.hostname}:8000`

  const apiUrl = (path) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`

  // Fetch initial settings
  useEffect(() => {
    fetch(apiUrl('/settings'))
      .then(res => res.json())
      .then(data => {
        if (data.cache_dir) setModelPath(data.cache_dir)
        if (data.gpu_device !== undefined) setSelectedGpu(data.gpu_device)
        if (data.fp8_quantization !== undefined) setFp8Quantization(data.fp8_quantization)
      })
      .catch(err => console.error("Failed to fetch settings", err))

    fetch(apiUrl('/system-info'))
      .then(res => res.json())
      .then(data => {
        if (data.gpus) setAvailableGpus(data.gpus)
      })
      .catch(err => console.error("Failed to fetch system info", err))
  }, [])

  const generate = async () => {
    if (!prompt) return
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...settings })
      })
      if (!res.ok) {
        throw new Error('Generation failed')
      }
      const data = await res.json()
      if (data.image) {
        setImage(data.image)
      }
    } catch (e) {
      console.error(e)
      alert('Error generating image. Check backend console.')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      const res = await fetch(apiUrl('/settings/model-path'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cache_dir: modelPath, gpu_device: selectedGpu, fp8_quantization: fp8Quantization })
      })
      if (res.ok) {
        setShowSettings(false)
        alert('Settings saved. Model will reload on next generation.')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (e) {
      alert('Error saving settings: ' + e.message)
    }
  }

  return (
    <div className={`app-shell ${image ? 'has-image' : 'no-image'}`}>

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-backdrop">
          <div className="settings-modal">
            <div className="settings-modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} /> Application Settings
              </h2>
              <button
                className="icon-btn icon-btn-round"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Model Cache Directory
                </label>
                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FolderOpen style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }} size={16} />
                    <input
                      type="text"
                      value={modelPath}
                      onChange={(e) => setModelPath(e.target.value)}
                      placeholder="/path/to/custom/cache"
                      style={{ width: '100%', paddingLeft: '40px' }}
                    />
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Leave empty to use default Hugging Face cache. Changing this will trigger a model reload.
                </p>
              </div>

              {availableGpus.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    GPU Selection
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableGpus.map((gpu) => (
                      <label key={gpu.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="gpu_selection"
                          value={gpu.id}
                          checked={selectedGpu === gpu.id}
                          onChange={() => setSelectedGpu(gpu.id)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {gpu.name} (ID: {gpu.id})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Select the GPU to use for inference.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Optimization
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fp8Quantization}
                    onChange={(e) => setFp8Quantization(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    Enable FP8 Quantization (optimum-quanto)
                  </span>
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Quantizes model to FP8 for lower VRAM usage. First run will take longer to quantize and save the model.
                </p>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button onClick={() => setShowSettings(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={saveSettings} className="btn btn-primary">
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="brand-mark">
                <Zap style={{ width: '20px', height: '20px', color: 'black' }} fill="black" />
              </div>
              <div>
                <h1 style={{ fontWeight: 700, fontSize: '18px', lineHeight: 1 }}>Z-Image-Turbo</h1>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px'
                }}>6B parameters</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href="https://github.com/Aaryan-Kapoor/z-image-turbo"
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                title="View on GitHub"
              >
                <Github size={18} />
              </a>
              <button
                onClick={() => setShowSettings(true)}
                className="icon-btn"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="sidebar-scroll">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <Sparkles size={14} />
              <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Parameters
              </h2>
            </div>

            {/* Inference Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>Inference Steps</label>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>{settings.steps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.steps}
                onChange={e => setSettings({ ...settings, steps: parseInt(e.target.value) })}
              />
            </div>

            {/* Guidance Scale */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>Guidance Scale</label>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}>{settings.guidance_scale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={settings.guidance_scale}
                onChange={e => setSettings({ ...settings, guidance_scale: parseFloat(e.target.value) })}
              />
            </div>

            {/* Dimensions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>Dimensions</label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {settings.width} x {settings.height}
                </span>
              </div>

              {/* Aspect Ratio Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Square', ratio: '1:1', w: 1024, h: 1024 },
                  { label: 'Portrait', ratio: '3:4', w: 896, h: 1152 },
                  { label: 'Land.', ratio: '4:3', w: 1152, h: 896 },
                  { label: 'Wide', ratio: '16:9', w: 1344, h: 768 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setSettings({ ...settings, width: preset.w, height: preset.h })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      backgroundColor: (settings.width === preset.w && settings.height === preset.h) ? 'white' : 'var(--bg-tertiary)',
                      color: (settings.width === preset.w && settings.height === preset.h) ? 'black' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700 }}>{preset.ratio}</span>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Resolution Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={[
                    "256x256", "512x288", "640x352",
                    "512x512", "768x768", "1024x1024",
                    "848x480", "1280x720", "1920x1088"
                  ].includes(`${settings.width}x${settings.height}`) ? `${settings.width}x${settings.height}` : "custom"}
                  onChange={(e) => {
                    if (e.target.value !== "custom") {
                      const [w, h] = e.target.value.split('x').map(Number);
                      setSettings({ ...settings, width: w, height: h });
                    }
                  }}
                  style={{
                    fontSize: '12px',
                    padding: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="custom" disabled>Select Resolution...</option>
                  <optgroup label="Tiny / Low Res">
                    <option value="256x256">256 x 256 (Tiny)</option>
                    <option value="512x288">512 x 288 (288p)</option>
                    <option value="640x352">640 x 352 (360p approx)</option>
                  </optgroup>
                  <optgroup label="Standard">
                    <option value="512x512">512 x 512 (SD)</option>
                    <option value="768x768">768 x 768 (SD+)</option>
                    <option value="1024x1024">1024 x 1024 (XL)</option>
                  </optgroup>
                  <optgroup label="Widescreen (16:9)">
                    <option value="848x480">848 x 480 (480p)</option>
                    <option value="1280x720">1280 x 720 (720p)</option>
                    <option value="1920x1088">1920 x 1088 (1080p)</option>
                  </optgroup>
                </select>
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Width Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Width</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{settings.width}px</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="2048"
                    step="16"
                    value={settings.width}
                    onChange={e => setSettings({ ...settings, width: parseInt(e.target.value) })}
                  />
                </div>

                {/* Height Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Height</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{settings.height}px</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="2048"
                    step="16"
                    value={settings.height}
                    onChange={e => setSettings({ ...settings, height: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Seed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: 500 }}>Seed</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Random (-1)"
                  value={settings.seed}
                  onChange={e => setSettings({ ...settings, seed: parseInt(e.target.value) })}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', width: '100%' }}
                />
                <button
                  onClick={() => setSettings({ ...settings, seed: -1 })}
                  style={{
                    padding: '0 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  title="Reset to Random"
                >
                  <span style={{ color: 'white' }}>RND</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="status-row">
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: loading ? '#eab308' : '#22c55e',
              boxShadow: loading ? '0 0 8px rgba(234, 179, 8, 0.5)' : '0 0 8px rgba(34, 197, 94, 0.5)'
            }}></div>
            <span>{loading ? 'Generating...' : 'System Ready'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main">

        {/* Top Bar */}
        <div className="top-bar">
          <div className="breadcrumbs">
            Workspace / <span style={{ color: 'white' }}>New Generation</span>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="image-area">
          {image ? (
            <div className="image-frame animate-fade-in image-container">
              <img
                src={image}
                alt="Generated"
                className="generated-image"
              />

              <div className="image-overlay">
                <button
                  className="overlay-btn overlay-btn-primary"
                  title="Download"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = image
                    link.download = `z-image-${Date.now()}.png`
                    link.click()
                  }}
                >
                  <Download size={24} />
                </button>
                <button
                  className="overlay-btn overlay-btn-glass"
                  title="View Fullscreen"
                  onClick={() => window.open(image, '_blank')}
                >
                  <Maximize2 size={24} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ImageIcon size={64} strokeWidth={1} />
              </div>
              <p className="empty-state-text">
                Enter a prompt to begin creation
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="bottom-bar">
          <div className="bottom-inner">
            <div className="prompt-wrap">
              <textarea
                  className="prompt-textarea"
                placeholder="Describe your imagination..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
                <div className="prompt-actions" style={{
                gap: '8px'
              }}>
                {image && (
                  <button
                    onClick={generate}
                    disabled={loading || !prompt}
                    className="btn btn-secondary"
                    title="Regenerate with same settings"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </button>
                )}
                <button
                  onClick={generate}
                  disabled={loading || !prompt}
                  className="btn btn-primary btn-generate"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="black" />}
                  <span>{loading ? 'Generating...' : 'Generate'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .image-container:hover .image-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}

export default App
