function copy(content) {
    navigator.clipboard.writeText(content).then(function() {
        alert('Copied!');
    }).catch(function(err) {
        alert('Copy failed！', err);
    });
};

function save(ele) {
    // 使用按钮上的 textarea-id 属性获取对应的 textarea ID
    var textareaId = ele.getAttribute('textarea-id');
    var filename = ele.getAttribute('data-filename');
    var text = document.getElementById(textareaId).value;
    text = text.replace(new RegExp(`\n*</?.*?_\\d+>`, 'g'), '\n');
    text = text.replace(new RegExp(`</?article>`, 'ug'), '');
    // 去除头尾的空行
    text = text.trim();
    // 使用正则表达式将上一行尾的空白字符和下一行的换行符替换为一个换行符
    text = text.replace(/[ \t]*\n/g, "\n");
    // 使用正则表达式将超过两个连续的换行符替换为两个连续换行符
    text = text.replace(/\n{2,}/g, "\n\n");

    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var downloadUrl = URL.createObjectURL(blob);
    
    // 创建临时的 a 元素用于下载
    var downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename; // 使用 textarea 的 ID 作为文件名
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
}

function load(ele) {
    // 确认用户至少选择了一个文件
    if (ele.files.length > 0) {
        // 获取第一个选中的文件
        const file = ele.files[0];

        // 创建FileReader来读取这个文件
        const reader = new FileReader();

        // 读取文件成功后，将内容写入到指定的textarea中
        reader.onload = (e) => {
            // 使用textarea-id属性找到对应的textarea
            const targetId = ele.getAttribute('textarea-id');
            const textarea = document.getElementById(targetId);
            if (textarea) {
                textarea.value = e.target.result;
            } else {
                console.error('Textarea with ID "' + targetId + '" not found.');
            }
            format(textarea);
        };

        // 以文本形式读取文件
        reader.readAsText(file);
    }
}

document.querySelectorAll('.save-Button').forEach(button => {
    button.addEventListener('click', function() {
        save(this);
    });
});

function click_load_button(ele) {
    var input = document.getElementById('load_input');
    input.setAttribute('textarea-id', ele.getAttribute('textarea-id'));
    if (input && input.type === "file") {
        input.click();
    }
}

document.querySelectorAll('.load-Button').forEach(button => {
    if (!button.dataset.clickEventAdded) {
        button.addEventListener('click', function() {
            click_load_button(this);
        });
        button.dataset.clickEventAdded = "true";
    }
});

document.getElementById('load_input').addEventListener('change', function() {
    load(this);
});


// async function post(url, body) {
//     fetch(`http://127.0.0.1:3006`+url, {
//           method: 'POST',
//           mode: 'cors',  // 确保跨域请求遵守 CORS 策略
//           headers: {
//             'Access-Control-Allow-Origin': '*',
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify(body)
//         })
//         .then(response => await response.json())
//         .then(data => {console.log(data);return data})
//         .catch(error => console.error('Error:', error));
//     }

function sound_alarm() {
    // 创建 AudioContext
    var audioContext = new AudioContext();
    // 创建一个 OscillatorNode（振荡器），用于生成声音
    var oscillator = audioContext.createOscillator();
    // 将振荡器连接到音频上下文的默认目的地（通常是扬声器）
    oscillator.connect(audioContext.destination);
    // 设置振荡器的类型，比如'sine'（正弦波），'square'（方波），'sawtooth'（锯齿波）,'triangle'（三角波）
    oscillator.type = 'sine';
    // 设置振荡器的频率，单位是赫兹（Hz）
    oscillator.frequency.setValueAtTime(311, audioContext.currentTime); 
    // 开始发声
    oscillator.start();

    // 设置一个定时器，0.2秒后停止发声
    setTimeout(function() {
        oscillator.stop();
    }, 300);

    // 设置一个定时器，0.2秒后播放另一段声音
    setTimeout(function() {
        var oscillator = audioContext.createOscillator();
        oscillator.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(415, audioContext.currentTime); 
        oscillator.start();
        setTimeout(function() {
            oscillator.stop();
            audioContext.close(); // 关闭 AudioContext，释放资源
        }, 200);

    }, 300);
}

async function post(url, body) {
    try {
        const response = await fetch(`${window.location.origin}${window.location.pathname}${url}`, {
            method: 'POST',
            mode: 'cors',  // 确保跨域请求遵守 CORS 策略
            headers: {
                'Access-Control-Allow-Origin': '*', // 注意：实际部署时这可能引起安全问题
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }

        const data = await response.json();
        return data; // 返回解析后的JSON数据
    } catch (error) {
        console.error('Error:', error);
        return ''; // 在错误发生时返回 null 或其他错误处理逻辑
    }
}

async function send2LLM(prompt, completion_mark, new_chat, close) {
    var data = await post('/LLMchat', 
                {
                  prompt: prompt.replaceAll('{', '\\{').replaceAll('}', '\\}'),
                  completion_mark: completion_mark,
                  new_chat: new_chat,
                  close: close
                });
    return data
}