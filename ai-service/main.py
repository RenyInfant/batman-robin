import os
import time
import math
import numpy as np
from PIL import Image
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Batman & Robin OpenCLIP AI Evaluation Service",
    version="1.0.0",
    description="Python Microservice for computing image embeddings & cosine similarity using OpenCLIP."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model Globals
device = "cpu"
model = None
preprocess = None
clip_available = False

try:
    import torch
    import open_clip

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[AI Service] Initializing OpenCLIP (ViT-B-32) on device: {device}...")
    
    # Load model once during startup
    model, _, preprocess = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
    model = model.to(device)
    model.eval()
    clip_available = True
    print(f"[AI Service] OpenCLIP model loaded successfully on {device}!")
except Exception as e:
    print(f"[AI Service Warning] OpenCLIP initialization notice: {e}")
    print("[AI Service] Fallback feature extraction engine active.")

def compute_pil_feature_embedding(img: Image.Image) -> np.ndarray:
    """Fallback high-precision feature vector generator if OpenCLIP weights are offline."""
    img_resized = img.convert('RGB').resize((224, 224))
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    
    # Spatial color grid histograms + mean feature vector
    r_hist, _ = np.histogram(arr[:, :, 0], bins=32, range=(0, 1))
    g_hist, _ = np.histogram(arr[:, :, 1], bins=32, range=(0, 1))
    b_hist, _ = np.histogram(arr[:, :, 2], bins=32, range=(0, 1))
    
    mean_color = arr.mean(axis=(0, 1))
    std_color = arr.std(axis=(0, 1))
    
    feat = np.concatenate([r_hist, g_hist, b_hist, mean_color, std_color])
    norm = np.linalg.norm(feat)
    return feat / norm if norm > 0 else feat

def get_image_embedding(image_path: str):
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")

    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to open image file: {str(e)}")

    if clip_available and model is not None and preprocess is not None:
        import torch
        image_input = preprocess(img).unsqueeze(0).to(device)
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            return image_features.cpu().numpy()[0]
    else:
        return compute_pil_feature_embedding(img)

class CompareRequest(BaseModel):
    reference_image_path: str
    submitted_image_path: str

class SubmissionItem(BaseModel):
    submission_id: int
    team_id: int
    filepath: str

class BatchCompareRequest(BaseModel):
    round_number: int
    reference_image_path: str
    submissions: List[SubmissionItem]

@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "Batman & Robin OpenCLIP AI Service",
        "model": "ViT-B-32",
        "device": device,
        "clip_engine": "OpenCLIP PyTorch" if clip_available else "Fallback Feature Processor"
    }

@app.post("/compare")
def compare_two_images(req: CompareRequest):
    ref_emb = get_image_embedding(req.reference_image_path)
    sub_emb = get_image_embedding(req.submitted_image_path)

    # Cosine Similarity
    similarity = float(np.dot(ref_emb, sub_emb))
    similarity_percentage = round(max(0.0, min(100.0, similarity * 100.0)), 2)

    return {
        "similarity": similarity_percentage
    }

@app.post("/batch-compare")
def batch_compare_images(req: BatchCompareRequest):
    start_time = time.time()
    ref_emb = get_image_embedding(req.reference_image_path)
    
    results = []
    for item in req.submissions:
        try:
            sub_emb = get_image_embedding(item.filepath)
            sim = float(np.dot(ref_emb, sub_emb))
            sim_pct = round(max(0.0, min(100.0, sim * 100.0)), 2)
            results.append({
                "submission_id": item.submission_id,
                "team_id": item.team_id,
                "similarity_score": sim_pct
            })
        except Exception as err:
            results.append({
                "submission_id": item.submission_id,
                "team_id": item.team_id,
                "similarity_score": 0.0,
                "error": str(err)
            })

    processing_time_sec = round(time.time() - start_time, 3)

    return {
        "round_number": req.round_number,
        "total_evaluated": len(results),
        "processing_time_seconds": processing_time_sec,
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
