import { useEffect, useMemo, useState } from 'react'

type Domain = 'robot' | 'drone'

type DomainItemsResponse = {
  robot: string[]
  drone: string[]
}

function App() {
  const [domain, setDomain] = useState<Domain>('robot')

  const [modelsByDomain, setModelsByDomain] = useState<DomainItemsResponse>({
    robot: [],
    drone: [],
  })

  const [videosByDomain, setVideosByDomain] = useState<DomainItemsResponse>({
    robot: [],
    drone: [],
  })

  const [videoName, setVideoName] = useState<string>('')

  const [selectedModels, setSelectedModels] = useState<string[]>([
    '',
    '',
    '',
    '',
  ])

  const [frameIdx, setFrameIdx] = useState<number>(0)
  const [conf, setConf] = useState<number>(0.3)

  const currentModelOptions = useMemo(() => {
    return modelsByDomain[domain] ?? []
  }, [modelsByDomain, domain])

  const currentVideoOptions = useMemo(() => {
    return videosByDomain[domain] ?? []
  }, [videosByDomain, domain])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [modelsRes, videosRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/models'),
          fetch('http://127.0.0.1:8000/videos'),
        ])

        const modelsData: DomainItemsResponse = await modelsRes.json()
        const videosData: DomainItemsResponse = await videosRes.json()

        setModelsByDomain(modelsData)
        setVideosByDomain(videosData)
      } catch (error) {
        console.error('초기 데이터 조회 실패:', error)
      }
    }

    fetchInitialData()
  }, [])

  useEffect(() => {
    const firstVideo = currentVideoOptions[0] ?? ''
    setVideoName(firstVideo)
    setFrameIdx(0)
  }, [domain, currentVideoOptions])

  useEffect(() => {
    if (currentModelOptions.length === 0) return

    setSelectedModels([
      currentModelOptions[0] ?? '',
      currentModelOptions[1] ?? currentModelOptions[0] ?? '',
      currentModelOptions[2] ?? currentModelOptions[0] ?? '',
      currentModelOptions[3] ?? currentModelOptions[0] ?? '',
    ])
  }, [currentModelOptions])

  const handleModelChange = (index: number, modelName: string) => {
    const next = [...selectedModels]
    next[index] = modelName
    setSelectedModels(next)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Model Compare Dashboard</h1>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ marginRight: '8px' }}>Domain</label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)}
        >
          <option value="robot">robot</option>
          <option value="drone">drone</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ marginRight: '8px' }}>Video</label>
        <select
          value={videoName}
          onChange={(e) => setVideoName(e.target.value)}
        >
          {currentVideoOptions.map((video) => (
            <option key={video} value={video}>
              {video}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label>Frame: {frameIdx}</label>
        <input
          type="range"
          min="0"
          max="300"
          value={frameIdx}
          onChange={(e) => setFrameIdx(Number(e.target.value))}
          style={{ width: '400px', marginLeft: '12px' }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label>Confidence: {conf.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={conf}
          onChange={(e) => setConf(Number(e.target.value))}
          style={{ width: '400px', marginLeft: '12px' }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {selectedModels.map((modelName, index) => {
          const imageUrl =
            modelName && videoName
              ? `http://127.0.0.1:8000/frame?domain=${domain}&video_name=${videoName}&model_name=${modelName}&frame_idx=${frameIdx}&conf=${conf}`
              : ''

          return (
            <div
              key={index}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label style={{ marginRight: '8px' }}>Model {index + 1}</label>
                <select
                  value={modelName}
                  onChange={(e) => handleModelChange(index, e.target.value)}
                >
                  {currentModelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                <strong>{modelName || `Model ${index + 1}`}</strong>
              </div>

              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`model-${index + 1}`}
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    border: '1px solid #999',
                  }}
                />
              ) : (
                <div>모델이나 영상을 선택하세요.</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App