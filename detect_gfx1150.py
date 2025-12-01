import subprocess
import sys

def detect_supported_hardware():
    """
    Detects if a supported AMD GPU or Ryzen AI Processor is present on Windows.
    """
    print("Checking for supported AMD Hardware...")
    
    # List of supported GPUs (Discrete or Integrated names)
    # Note: WMI usually returns names without trademarks, but we handle both.
    supported_gpus = [
        "Radeon RX 9070",
        "Radeon RX 9070 XT",
        "Radeon AI PRO R9700",
        "Radeon RX 9060 XT",
        "Radeon RX 7900 XTX",
        "Radeon PRO W7900",
        "Radeon PRO W7900 Dual Slot",
        "Radeon 780M", # gfx1150
        "Radeon 890M", # Ryzen AI 300 series high end
        "Radeon 880M", # Ryzen AI 300 series mid
    ]

    # List of supported Processors (APUs)
    # These contain the NPU/GPU combo
    supported_cpus = [
        "Ryzen AI Max+ 395",
        "Ryzen AI Max 390",
        "Ryzen AI Max 385",
        "Ryzen AI 9 HX 375",
        "Ryzen AI 9 HX 370",
        "Ryzen AI 9 365"
    ]

    found_supported = False

    try:
        # 1. Check GPUs
        cmd_gpu = 'wmic path win32_videocontroller get name, pnpdeviceid'
        result_gpu = subprocess.check_output(cmd_gpu, shell=True).decode()
        
        print("\n--- System GPUs ---")
        print(result_gpu.strip())
        
        for gpu in supported_gpus:
            # Remove trademark symbols for matching
            clean_gpu = gpu.replace("™", "").replace("®", "")
            if clean_gpu in result_gpu or gpu in result_gpu:
                print(f"✅ DETECTED GPU: {gpu}")
                found_supported = True

        # 2. Check CPUs (for Ryzen AI parts)
        cmd_cpu = 'wmic cpu get name'
        result_cpu = subprocess.check_output(cmd_cpu, shell=True).decode()
        
        print("\n--- System CPU ---")
        print(result_cpu.strip())

        for cpu in supported_cpus:
            clean_cpu = cpu.replace("™", "").replace("®", "")
            if clean_cpu in result_cpu or cpu in result_cpu:
                print(f"✅ DETECTED CPU: {cpu}")
                found_supported = True

        print("-------------------\n")

        if found_supported:
            print("✅ CONFIRMED: Supported AMD Hardware detected.")
            print("Recommended Path: ONNX Runtime with DirectML (DmlExecutionProvider)")
            return True
        elif "AMD" in result_gpu or "Radeon" in result_gpu:
            print("⚠️  AMD GPU detected, but not explicitly in the target list.")
            print("DirectML is likely still the best option if this is RDNA2/3/4.")
            return False
        else:
            print("❌ No supported AMD hardware detected.")
            return False

    except Exception as e:
        print(f"Error detecting hardware: {e}")
        return False

if __name__ == "__main__":
    detect_supported_hardware()
