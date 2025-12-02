from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import mcp.types as types
from mcp.server.lowlevel import Server
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
import contextlib
from starlette.routing import Mount
from starlette.types import Scope, Receive, Send

try:
    from diffusers import ZImagePipeline
except ImportError:
    # Fallback or mock for development if diffusers is not updated yet
    print("ZImagePipeline not found in diffusers. Please install from source.")
    ZImagePipeline = None

try:
    from optimum.quanto import quantize, freeze, qfloat8
except ImportError:
    print("optimum-quanto not installed. Quantization features will be unavailable.")
    quantize = None

import torch
import io
import base64
import uuid
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import os

# MCP Server Init
mcp_server = Server("z-image-turbo")
session_manager = StreamableHTTPSessionManager(mcp_server, stateless=True)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with session_manager.run():
        yield

app = FastAPI(lifespan=lifespan)

async def handle_mcp(scope: Scope, receive: Receive, send: Send):
    await session_manager.handle_request(scope, receive, send)

app.router.routes.append(Mount("/mcp", app=handle_mcp))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import json

CONFIG_FILE = "config.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")
    return {
        "cache_dir": "",
        "model_id": "Tongyi-MAI/Z-Image-Turbo",
        "gpu_device": 1,
        "cpu_offload": True,
        "fp8_quantization": True
    }

def save_config(config):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        print(f"Error saving config: {e}")

import psutil
import time

# Global configuration
model_config = load_config()
if "cpu_offload" not in model_config:
    model_config["cpu_offload"] = False
if "fp8_quantization" not in model_config:
    model_config["fp8_quantization"] = True

# Global variable for the pipeline
pipe = None

def get_pipeline():
    global pipe
    if pipe is None:
        if ZImagePipeline is None:
            raise HTTPException(status_code=500, detail="ZImagePipeline class not available. Install diffusers from source.")
            
        print(f"Loading model {model_config['model_id']}...")
        
        if model_config['cache_dir']:
            print(f"Using cache directory: {model_config['cache_dir']}")

        try:
            # Check for CUDA
            gpu_id = model_config.get("gpu_device", 0)
            if torch.cuda.is_available():
                device_count = torch.cuda.device_count()
                available_gpus = [torch.cuda.get_device_name(i) for i in range(device_count)]
                
                if gpu_id < 0 or gpu_id >= device_count:
                    print(f"Warning: Configured GPU {gpu_id} is not available.")
                    print(f"Available GPUs: {available_gpus}")
                    print("Falling back to GPU 0.")
                    gpu_id = 0
                    model_config["gpu_device"] = 0
                
                device = f"cuda:{gpu_id}"
            else:
                print("No CUDA devices found. Falling back to CPU.")
                device = "cpu"
            
            dtype = torch.bfloat16 if "cuda" in device else torch.float32
            
            should_quantize = model_config.get("fp8_quantization", False)
            if should_quantize and quantize is not None:
                print("Quantization enabled. Loading original model and quantizing...")
                pipe = ZImagePipeline.from_pretrained(
                    model_config['model_id'],
                    torch_dtype=dtype,
                    low_cpu_mem_usage=False,
                    cache_dir=model_config['cache_dir']
                )
                
                print("Quantizing transformer, text_encoder and VAE to FP8...")
                quantize(pipe.transformer, weights=qfloat8)
                freeze(pipe.transformer)
                
                if hasattr(pipe, "text_encoder") and pipe.text_encoder is not None:
                    quantize(pipe.text_encoder, weights=qfloat8)
                    freeze(pipe.text_encoder)

                if hasattr(pipe, "vae") and pipe.vae is not None:
                    quantize(pipe.vae, weights=qfloat8)
                    freeze(pipe.vae)
            else:
                pipe = ZImagePipeline.from_pretrained(
                    model_config['model_id'],
                    torch_dtype=dtype,
                    low_cpu_mem_usage=False,
                    cache_dir=model_config['cache_dir']
                )
            
            if model_config.get("cpu_offload", False) and "cuda" in device:
                print("Enabling CPU Offload")
                pipe.enable_model_cpu_offload(gpu_id=gpu_id)
            else:
                pipe.to(device)
                
            print(f"Model loaded on {device}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e
    return pipe

class SettingsRequest(BaseModel):
    cache_dir: str
    cpu_offload: bool = False
    gpu_device: int = 0
    fp8_quantization: bool = False

@app.post("/settings/model-path")
async def set_model_path(req: SettingsRequest):
    global pipe
    try:
        if req.cache_dir and not os.path.exists(req.cache_dir):
            os.makedirs(req.cache_dir, exist_ok=True)
        
        model_config["cache_dir"] = req.cache_dir
        model_config["cpu_offload"] = req.cpu_offload
        model_config["gpu_device"] = req.gpu_device
        model_config["fp8_quantization"] = req.fp8_quantization
        save_config(model_config)
        # Force reload of the pipeline
        pipe = None
        return {"status": "success", "message": "Settings saved. Model will reload on next generation."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system-info")
def get_system_info():
    gpus = []
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            gpus.append({
                "id": i,
                "name": torch.cuda.get_device_name(i)
            })
    return {"gpus": gpus}

@app.get("/settings")
async def get_settings():
    return model_config

class GenerateRequest(BaseModel):
    prompt: str
    height: int = 1024
    width: int = 1024
    steps: int = 8
    guidance_scale: float = 0.0
    seed: int = -1

def generate_image_core(prompt: str, height: int = 1024, width: int = 1024, steps: int = 8, guidance_scale: float = 0.0, seed: int = -1):
    # Validate dimensions
    if height % 16 != 0 or width % 16 != 0:
        raise ValueError("Height and Width must be divisible by 16.")

    pipeline = get_pipeline()
    
    gpu_id = model_config.get("gpu_device", 0)
    if torch.cuda.is_available():
        if gpu_id < 0 or gpu_id >= torch.cuda.device_count():
            gpu_id = 0
        device = f"cuda:{gpu_id}"
    else:
        device = "cpu"

    generator = None
    if seed != -1:
        generator = torch.Generator(device).manual_seed(seed)
    
    # Run inference
    print(f"Generating with prompt: {prompt}")
    
    image = pipeline(
        prompt=prompt,
        height=height,
        width=width,
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        generator=generator,
    ).images[0]
    
    # Save to output folder
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{timestamp}_{unique_id}.png"
    filepath = os.path.join(output_dir, filename)
    image.save(filepath)
    print(f"Image saved to {filepath}")

    # Convert to base64
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return img_str

@app.post("/generate")
def generate_image(req: GenerateRequest):
    try:
        img_str = generate_image_core(req.prompt, req.height, req.width, req.steps, req.guidance_scale, req.seed)
        return {"image": f"data:image/png;base64,{img_str}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error generating image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@mcp_server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="generate-image",
            description="Generate an image based on a text prompt.",
            inputSchema={
                "type": "object",
                "required": ["prompt"],
                "properties": {
                    "prompt": {"type": "string", "description": "The text prompt to generate the image from"},
                    "height": {"type": "integer", "default": 1024, "description": "Height of the image"},
                    "width": {"type": "integer", "default": 1024, "description": "Width of the image"},
                    "steps": {"type": "integer", "default": 8, "description": "Number of inference steps"},
                    "guidance_scale": {"type": "number", "default": 0.0, "description": "Guidance scale"},
                    "seed": {"type": "integer", "default": -1, "description": "Random seed"}
                }
            }
        )
    ]

@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.ContentBlock]:
    if name == "generate-image":
        prompt = arguments.get("prompt")
        height = arguments.get("height", 1024)
        width = arguments.get("width", 1024)
        steps = arguments.get("steps", 8)
        guidance_scale = arguments.get("guidance_scale", 0.0)
        seed = arguments.get("seed", -1)
        
        try:
            img_base64 = await run_in_threadpool(generate_image_core, prompt, height, width, steps, guidance_scale, seed)
            return [
                types.ImageContent(
                    type="image",
                    data=img_base64,
                    mimeType="image/png",
                    annotations={
                        "audience": ["user"],
                        "priority": 1.0
                    }
                )
            ]
        except Exception as e:
             return [types.TextContent(type="text", text=f"Error generating image: {str(e)}")]
    
    raise ValueError(f"Unknown tool: {name}")

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
