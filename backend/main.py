from fastapi import FastAPI, Query  # FastAPI = 서버 만들기, Query = URL 파라미터 받기(frame_idx=0)
from fastapi.responses import Response  # Response = 이미지 응답 반환 
from fastapi.middleware.cors import CORSMiddleware # CORSMiddleware = React랑 연결 허용
from ultralytics import YOLO
import cv2
import os
import glob

app = FastAPI() # 앱 생성(서버 생성)

# CORS 설정(중요) React(5173포트) -> FastAPI(8000포트) 요청을 브라우저가 막으면 풀어주는 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 일단은 하드코딩으로 시작(나중에 선택 가능하게 바꿀 예정)

# ORIGIN_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/origin/*"))
# DRONE_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/drone/*"))
# ROBOT_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/robot/*"))

def make_model_dict(paths, prefix=""):
    return {
        f"{prefix}{os.path.splitext(os.path.basename(path))[0]}": path
        for path in paths
    }

# MODEL_CONFIGS = {
#     "drone": {
#         **make_model_dict(ORIGIN_MODEL_PATHS, prefix="origin_"),
#         **make_model_dict(DRONE_MODEL_PATHS),
#     },
#     "robot": {
#         **make_model_dict(ORIGIN_MODEL_PATHS, prefix="origin_"),
#         **make_model_dict(ROBOT_MODEL_PATHS),
#     },
# }

# ROBOT_VID_LISTS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/videos/robot/*"))
# DRONE_VID_LISTS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/videos/drone/*"))

# VIDEO_CONFIGS = {
#     "robot": {f"robot_vid_{i}": ROBOT_VID_LISTS[i] for i in range(len(ROBOT_VID_LISTS))},
#     "drone": {f"drone_vid_{i}": DRONE_VID_LISTS[i] for i in range(len(DRONE_VID_LISTS))}
# }

# # 서버 시작할 때 한 번만 로드
# models = {}

# for domain, domain_models in MODEL_CONFIGS.items():
#     models[domain] = {}
#     for model_name, model_path in domain_models.items():
#         models[domain][model_name] = YOLO(model_path)


# 모델, 비디오 반환 함수
def get_model_configs():
    ORIGIN_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/origin/*"))
    DRONE_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/drone/*"))
    ROBOT_MODEL_PATHS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/models/robot/*"))

    return {
        "drone": {
        **make_model_dict(ORIGIN_MODEL_PATHS, prefix="origin_"),
        **make_model_dict(DRONE_MODEL_PATHS),
        },
        "robot": {
            **make_model_dict(ORIGIN_MODEL_PATHS, prefix="origin_"),
            **make_model_dict(ROBOT_MODEL_PATHS),
        },
    }

def get_video_configs():
    ROBOT_VID_LISTS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/videos/robot/*"))
    DRONE_VID_LISTS = sorted(glob.glob("/home/seobin1027/tasks2/연구과제/드론로봇/upgrade-ver/videos/drone/*"))

    return {
        "robot": {f"{os.path.splitext(os.path.basename(path))[0]}": path for path in ROBOT_VID_LISTS},
        "drone": {f"{os.path.splitext(os.path.basename(path))[0]}": path for path in DRONE_VID_LISTS},
    }


# 모델 가져오는 함수
loaded_models = {}

def get_loaded_model(domain: str, model_name: str):
    model_configs = get_model_configs()

    if domain not in model_configs:
        return None, Response(content=b"invalid domain", status_code=404)
    
    if model_name not in model_configs[domain]:
        return None, Response(content=b"model not found", status_code=404)
    
    model_path = model_configs[domain][model_name]
    cache_key = f"{domain}:{model_name}"

    if cache_key not in loaded_models:
        loaded_models[cache_key] = YOLO(model_path)

    return loaded_models[cache_key], None


# 박스 그리는 함수
def draw_custom_boxes(frame, result, is_default_model, conf_thres=0.3):
    for box in result.boxes:
        x1, y1, x2, y2 = box.xyxy[0]
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])

        if conf < conf_thres:
            continue

        if is_default_model:
            if cls_id == 0:
                label = "person"
                color = (0, 255, 0)
            elif cls_id in [2, 3, 5, 7]:
                label = "vehicle"
                color = (0, 0, 255)
            else:
                continue
        else:
            if cls_id == 0:
                label = "person"
                color = (0, 255, 0)
            elif cls_id == 1:
                label = "vehicle"
                color = (0, 0, 255)
            else:
                continue

        x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            f"{label} {conf:.2f}",
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2,
        )

    return frame

def get_video_path(domain: str, video_name: str):
    configs = get_video_configs()
    if domain not in configs:
        return None, Response(content=b"invalid domain", status_code=404)
    
    if video_name not in configs[domain]:
        return None, Response(content=b"video not found", status_code=404)
    
    video_path = configs[domain][video_name]

    if not os.path.exists(video_path):
        return None, Response(content=b"video not found", status_code=404)
    
    return video_path, None

def open_video_capture(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None, Response(content=b"failed to open video", status_code=500)
    
    return cap, None

# 서버 살아있는지 확인용
@app.get("/")
def root():
    return {"message": "backend ok"}

@app.get("/models")
def get_models():
    configs = get_model_configs()
    return {
        "robot": list(configs["robot"].keys()),
        "drone": list(configs["drone"].keys()),
    }

@app.get("/videos")
def get_videos():
    configs = get_video_configs()
    return {
        "robot": list(configs["robot"].keys()),
        "drone": list(configs["drone"].keys()),
    }


# 핵심
@app.get("/frame")
def get_frame(
    # Query 파라미터(URL에서 값 받음) ex)/frame?frame_idx=100&conf=0.5
    domain: str = Query(...),
    model_name: str = Query(...),
    video_name: str = Query(...),
    frame_idx: int = Query(0, ge=0),
    conf: float = Query(0.3, ge=0.0, le=1.0),
):  
    print("FRAME REQUEST:", domain, video_name, model_name, frame_idx, conf)

    model, error_response = get_loaded_model(domain, model_name)

    if error_response:
        return error_response
    
    print("MODEL LOADED")

    is_default = len(model.names) > 2

    video_path, error_response = get_video_path(domain, video_name)
    if error_response:
        return error_response
    
    cap, error_response = open_video_capture(video_path)
    if error_response:
        return error_response

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return Response(content=b"failed to read frame", status_code=404)
    
    frame = cv2.resize(frame, (640, 360))

    print("BEFORE INFER")
    results = model(frame, verbose=False)
    print("AFTER INFER")
    result = results[0]
    vis_frame = draw_custom_boxes(frame.copy(), result, is_default, conf_thres=conf)

    ok, buffer = cv2.imencode(".jpg", vis_frame)
    if not ok:
        return Response(content=b"failed to encode image", status_code=500)
    
    # 응답 반환 
    return Response(content=buffer.tobytes(), media_type="image/jpeg")

@app.get("/video-meta")
def get_video_meta(
    domain: str = Query(...),
    video_name: str = Query(...),
):
    video_path, error_response = get_video_path(domain, video_name)
    if error_response:
        return error_response
    
    cap, error_response = open_video_capture(video_path)
    if error_response:
        return error_response
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_sec = total_frames / fps if fps > 0 else 0

    cap.release()

    return {
        "domain": domain,
        "video_name": video_name,
        "total_frames": total_frames,
        "fps": fps,
        "width": width,
        "height": height,
        "duration_sec": duration_sec,
    }