import os
from os import path
import subprocess
import sys
import importlib
import toml

def install_package(package):
    try:
        # 尝试导入包
        importlib.import_module(package)
    except ImportError:
        # 如果包不存在，使用pip安装
        print(f"'{package}' 未安装，正在安装...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"'{package}' 安装成功")

def run_uvicorn():
    config_path = os.path.join(os.path.dirname(__file__), "config.txt")
    with open(config_path, "a+") as f:
        f.seek(0)  # 移动文件指针到文件开头
        config = toml.load(f)

        changed = False

        if config.get("DeepL_API_key") is None:
            DeepL_API_key = input("请填写DeepL的API Key，按回车键继续。")
            config['DeepL_API_key'] = DeepL_API_key # 5225af3e-9652-80ce-c74e-307ead3e9880:fx
            changed = True
            print()
            
        if config.get("Model") is None:
            provider = ["GPT (OpenAI)", "Claude (Anthropic)", "Gemini (Google)"]
            for idx, model in enumerate(provider):
                print(f"{idx+1}: {model}")
            model_idx = int(input("请选择要使用的语言模型，输入序号，按回车键继续："))
            config['Model'] = provider[model_idx - 1]

            config['Model_API_key'] = input("请填写语言模型的API Key，按回车键继续：")
            changed = True

        if changed:
            toml.dump(config, f)

        model = config.get("Model")
        if model == 'GPT (OpenAI)':
            install_package("langchain_openai")
        elif model == 'Claude (Anthropic)':
            install_package("langchain-anthropic")
        elif model == 'Gemini (Google)':
            install_package("langchain_google_genai")

    import socket
    port = 3006
    for t in range(3006, 4006):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            if s.connect_ex(('localhost', t)) != 0:
                port = t
                break        
    else:
        raise RuntimeError("没有可用的端口，请重启系统。")
    
    import webbrowser
    webbrowser.open(f'http://127.0.0.1:{port}/')

    # 获取当前脚本所在的目录，也就是包的路径
    package_path = os.path.dirname(os.path.abspath(__file__))

    # 改变工作目录到包路径
    os.chdir(package_path)
    
    # 构建命令并运行
    import platform
    os_type = platform.system()
    if os_type == "Windows":
        command = f'start uvicorn __init__:app --port {port} --reload'
    elif os_type == "Linux":
        command = f'uvicorn __init__:app --port {port} --reload'
    elif os_type == "Darwin":
        command = f'uvicorn __init__:app --port {port} --reload'

    # 注意：为了支持 Windows 的 start 命令，这里需要使用 shell=True
    subprocess.run(command, shell=True)

if __name__ == "__main__":
    run_uvicorn()