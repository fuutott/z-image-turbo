# THIS IS A BROKEN BRANCH

# changes from Aaryan-Kapoor/z-image-turbo
- FP8 default
- Select GPU option in settings
- MCP server as part of backend

# Z-Image-Turbo

> A professional web interface for the Tongyi-MAI Z-Image-Turbo model — lightning-fast text-to-image generation with 6B parameters.

![Z-Image-Turbo Interface](assets/projectScreenshot.png)

![Z-Image-Turbo](https://img.shields.io/badge/Model-Z--Image--Turbo-blue) ![License](https://img.shields.io/badge/License-Apache%202.0-green)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- 8GB+ VRAM recommended (or use CPU offload)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aaryan-Kapoor/z-image-turbo.git
   cd z-image-turbo
   ```

2. **Backend Setup**
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   
   # Standard installation
   pip install -r requirements.txt

   # OR for CUDA 12.1 (Recommended for NVIDIA GPUs)
   pip install -r requirements-cuda.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

**Terminal 1 - Start Backend:**
```bash
.\venv\Scripts\activate  # or source venv/bin/activate on Linux/Mac
cd backend
python main.py
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser and start generating!

---

## ✨ Features

### Application
- **Premium Dark UI** — Glassmorphism design with intuitive controls
- **Smart Presets** — Quick aspect ratios (1:1, 3:4, 16:9) and resolutions (480p-1080p)
- **Fine Control** — Sliders for dimensions, inference steps, guidance scale, and seed
- **Real-time Progress** — Live generation tracking
- **Flexible Deployment** — Custom model cache directory, CPU offload option
- **MCP Support** — Native Model Context Protocol integration for AI agents

### Model (Z-Image-Turbo)
- **⚡ Lightning Fast** — Optimized for **8-step generation**, achieving sub-second latency on enterprise GPUs.
- **🏗️ S3-DiT Architecture** — Built on **Scalable Single-Stream Diffusion Transformer** technology.
- **🧠 Advanced Encoders** — Uses **Qwen 4B** for powerful language understanding and **Flux VAE** for image decoding.
- **🎓 DMDR Training** — Trained using **Fusing DMD with Reinforcement Learning** for superior semantic alignment.
- **🌐 Bilingual Mastery** — Exceptional rendering of text in both **English and Chinese**.
- **🎨 Versatile & Uncensored** — From photorealism to anime, handling complex concepts without censorship.
- **📐 High Fidelity** — Native support for resolutions up to **2MP** (e.g., 1024x1536, 1440x1440).
- **💾 Efficient** — 6B parameters, comfortably fitting in 16GB VRAM (fully loaded on GPU) using default FP8 quantization.

---

## 🔬 Technical Architecture

Z-Image-Turbo represents a significant leap in efficient generative AI:

*   **Base Architecture**: S3-DiT (Scalable Single-Stream DiT)
*   **Text Encoder**: Qwen 4B (Large Language Model based conditioning)
*   **VAE**: Flux Autoencoder
*   **Training Method**: Distilled from Z-Image using DMDR (DMD + RL)
*   **Inference**: 8 NFEs (Number of Function Evaluations) default
*   **Precision**: Optimized for bfloat16 / fp8 (Default)

---

## 🛠️ Tech Stack

- **Backend:** FastAPI, PyTorch, Diffusers, Transformers
- **Frontend:** React, Vite, Lucide React
- **Model:** Tongyi-MAI/Z-Image-Turbo (6B parameters)

---

## ⚙️ Configuration

Access settings via the gear icon in the sidebar:
- **Model Cache Directory** — Specify where to download/store the model
- **CPU Offload** — Enable for GPUs with limited VRAM

---

## 📝 License

This project is open-source under the Apache 2.0 License.

---

## 🙏 Credits

- **Model:** [Tongyi-MAI/Z-Image-Turbo](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo) by Alibaba Group
- **UI Framework:** React + Vite
- **Backend:** FastAPI + Diffusers

## 🔌 Model Context Protocol (MCP)

This server implements the [Model Context Protocol](https://modelcontextprotocol.io/), allowing AI agents (like Claude Desktop or other MCP clients) to directly control the image generation.

- **Endpoint**: `http://localhost:8000/mcp` (Streamable HTTP)
- **Tools**:
  - `generate-image`: Generates an image from a text prompt.
    - Arguments: `prompt` (string), `height` (int), `width` (int), `steps` (int), `guidance_scale` (float), `seed` (int)

