import { useEffect, useMemo, useState } from 'react'

type Domain = 'robot' | 'drone'

type DomainItemsResponse = {
  robot: string[]
  drone: string[]
}

function App() {
  const [domain, setDomain] = useState<Domain>('robot')
  // 백엔드 /models 에서 받아온 결과 저장하는 곳, 처음엔 빈 배열
  const [modelsByDomain, setModelsByDomain] = useState<DomainItemsResponse>({
    robot: [],
    drone: [],
  })

  // /videos 결과 저장용, 처음엔 비어 있고, fetch 후 채워짐
  const [videosByDomain, setVideosByDomain] = useState<DomainItemsResponse>({
    robot: [],
    drone: [],
  })

  const [errorMessage, setErrorMessage] = useState('')

  const fetchInitialData = async () => {
    try {
      setErrorMessage('')

      const [modelsRes, videosRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/models'),
        fetch('http://127.0.0.1:8000/videos'),
      ])

      if (!modelsRes.ok) {
        throw new Error(`/models 요청 실패: ${modelsRes.status}`)
      }

      if (!videosRes.ok) {
        throw new Error(`/videos 요청 실패: ${videosRes.status}`)
      }

      const modelsData: DomainItemsResponse = await modelsRes.json()
      const videosData: DomainItemsResponse = await videosRes.json()

      setModelsByDomain(modelsData)
      setVideosByDomain(videosData)
    } catch (error) {
      console.error('초기 데이터 조회 실패:', error)
      setErrorMessage(String(error))
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])
  
  // 현재 선택된 영상 이름
  const [videoName, setVideoName] = useState<string>('')

  // 모델 4개 담는 배열
  const [selectedModels, setSelectedModels] = useState<string[]>([
    '',
    '',
    '',
    '',
  ])
  
  // /frame 요청에 그대로 들어갈 값
  const [frameIdx, setFrameIdx] = useState<number>(0)
  const [conf, setConf] = useState<number>(0.3)

  // 현재 도메인 기준 목록 뽑기
  const currentModelOptions = useMemo(() => {
    return modelsByDomain[domain] ?? []
  }, [modelsByDomain, domain])

  const currentVideoOptions = useMemo(() => {
    return videosByDomain[domain] ?? []
  }, [videosByDomain, domain])



  const [totalFrames, setTotalFrames] = useState<number>(0)
  const [fps, setFPS] = useState<number>(0)


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
  
  // 드롭다운에서 모델 바꾸면 해당 칸만 바꾸는 함수
  const handleModelChange = (index: number, modelName: string) => {
    const next = [...selectedModels]
    next[index] = modelName
    setSelectedModels(next)
  }

  const moveFrame = (delta: number) => {
    setFrameIdx((prev) => {
      const next = prev +delta
      const maxFrame = Math.max(totalFrames -1, 0)

      if (next < 0) return 0
      if (next > maxFrame) return maxFrame

      return next
    })
  }



  useEffect(() => {
    const fetchVideoMeta = async () => {
      if(!videoName) return

      try {
        const res = await fetch(
          `http://127.0.0.1:8000/video-meta?domain=${domain}&video_name=${videoName}`
        )

        if (!res.ok) {
          throw new Error(`/video-meta 요청 실패: ${res.status}`)
        }

        const data = await res.json()
        console.log('video meta:', data)

        setTotalFrames(data.total_frames)
        setFPS(data.fps)
        setFrameIdx(0)

      } catch (error) {
        console.error('비디오 메타데이터 조회 실패:', error)
        setErrorMessage(String(error))
      }
    }

    fetchVideoMeta()
  }, [domain, videoName])
  

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <button onClick={fetchInitialData}>Refresh models/videos</button>

      <h1>Model Compare Dashboard</h1>

      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '16px' }}>
          에러: {errorMessage}
        </div>
        )}

      {/* domain select */}
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

      {/* video select */}
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
      
      {/* confidence slider */}
      <div style={{ marginBottom: '10px' }}>
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

      {/* total frames */}
      <div style={{ marginBottom: '10px' }}>
        Total Frames: {totalFrames} | FPS: {fps.toFixed(2)}
      </div>

  
      {/* frame slider */}
      <div style={{ marginBottom: '10px' }}>
        <label>Frame: {frameIdx}</label>
        <input
          type="range"
          min="0"
          max={Math.max(totalFrames - 1, 0)}
          value={frameIdx}
          onChange={(e) => {
            setFrameIdx(Number(e.target.value))
          }}
          style={{ width: '400px', marginLeft: '12px' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => moveFrame(-100)}>-100</button>
        <button onClick={() => moveFrame(-10)} style={{ marginLeft: '8px' }}>
          -10
        </button>
        <button onClick={() => moveFrame(-1)} style={{ marginLeft: '8px' }}>
          -1
        </button>

        <button onClick={() => moveFrame(1)} style={{ marginLeft: '16px' }}>
          +1
        </button>
        <button onClick={() => moveFrame(10)} style={{ marginLeft: '8px' }}>
          +10
        </button>
        <button onClick={() => moveFrame(100)} style={{ marginLeft: '8px' }}>
          +100
        </button>

        <button
          onClick={() => {
            setFrameIdx(0)
          }}
          style={{ marginLeft: '16px' }}
        >
          Reset
        </button>
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