import sys
import io
import torch # type: ignore
import torchaudio # type: ignore
from flask import Flask, request, Response ,jsonify # type: ignore
from urllib.parse import quote
# 其他代码保持不变，保持原有结构
from cosyvoice.cli.cosyvoice import CosyVoice, CosyVoice2
from cosyvoice.utils.file_utils import load_wav

sys.path.append('third_party/Matcha-TTS')
torchaudio.set_audio_backend("sox_io")
app = Flask(__name__)

tempMap = {
    'demo':'asset/zero_shot_prompt.wav',
    'nv_16k':'asset/cuishou_nv_16k.wav',
    'nan_16k':'asset/cuishou_nan_16k.wav',
    'nv_8k':'asset/cuishou_nv_8k.wav',
    'nan_8k':'asset/cuishou_nan_8k.wav',
}
cosyvoice = None
prompt_speech = None
model_name = 'iic/CosyVoice2-0.5B'
target_sr = 16000
def initialize():
    global prompt_speech
    global cosyvoice
    cosyvoice = CosyVoice2(model_name, load_jit=False, load_trt=False, fp16=False )
    # assert cosyvoice.sample_rate == target_sr, "采样率不匹配"
    # 验证torchaudio支持的编码
    print(cosyvoice.sample_rate)
    print(torchaudio.get_audio_backend())  # 应输出'sox_io'


    prompt_speech = load_prompt('demo')  # 示例初始化操作
def load_prompt(prompt_name='demo'):
    if prompt_name in tempMap:
        print(__name__,'prompt_name,tempMap[prompt_name]',prompt_name,tempMap[prompt_name])
        return load_wav(tempMap[prompt_name],target_sr)
    else:
        raise ValueError(f"Prompt '{prompt_name}' not found.")

'''
[breath]', 呼吸声
'<strong>', '</strong>', 强调
'[noise]',噪声
'[laughter]', 笑声
'[cough]', 咳嗽
'[clucking]', 咯咯声
'[accent]',重音
'[quick_breath]',快速呼吸声
"<laughter>", "</laughter>",
"[hissing]", 嘶嘶声
"[sigh]", 叹气
"[vocalized-noise]",发声噪音
"[lipsmack]", 咂嘴
"[mn]"
'''
def stream_audio(text_input, prompt, prompt_audio):
    audio_tensors = []
    prompt_speech_16k = prompt_audio
    # 修改循环解包方式（关键点）
    for j in cosyvoice.inference_instruct2(
        text_input, prompt, prompt_speech_16k, stream=True, speed=1.1, text_frontend=True
    ):
        audio_tensors.append(j['tts_speech'])  # 直接访问字典
    
    combined_audio = torch.cat(audio_tensors, dim=-1)
    byte_io = io.BytesIO()
    torchaudio.save(byte_io, combined_audio, cosyvoice.sample_rate, format="wav")
    return byte_io.getvalue()

# def stream_audio(text_input, prompt, prompt_audio):
#     audio_segments = []
#     prompt_speech_16k = prompt_audio
#     for i, j in enumerate(cosyvoice.inference_instruct2(text_input,prompt,  prompt_speech_16k, stream=False,speed=1.2,text_frontend=True)):
#         audio_data = j['tts_speech']  # 获取音频数据
#         byte_io = io.BytesIO()
#         torchaudio.save(byte_io, audio_data, cosyvoice.sample_rate, format="wav")
#         audio_segments.append(byte_io.getvalue())
#         # torchaudio.save('asset/zero_shot_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)
#     return b"".join(audio_segments)  # 合并所有音频片段


@app.route('/tts_stream')
def tts_stream():
    # try:
    text = request.args.get('text')
    prompt = '用口吻表达这个句子，语速一致'
    if not text:
        return jsonify({"error": "缺少文本参数"}), 400
        
    prompt_name = request.args.get('prompt', 'demo')
    if prompt_name not in tempMap:
        return jsonify({"error": f"无效的提示名称: {prompt_name}"}), 400
        
    prompt_speech = load_prompt(prompt_name)
        
    audio_bytes = stream_audio(text, prompt,prompt_speech)  # 修正参数传递
        
    return Response(
        audio_bytes,
        mimetype="audio/wav",
        headers={
            'Content-Type': 'audio/wav',
            'Content-Disposition': f'attachment; filename="tts.wav"'
        }
    )
    # except Exception as e:
    #     app.logger.error(f"生成失败: {str(e)}")
    #     return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    initialize()
    port = sys.argv[1] if len(sys.argv) >= 2 else 5001
    app.run(host='0.0.0.0',port=port,threaded=True)