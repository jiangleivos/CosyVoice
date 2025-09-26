import sys
import io
import os
import torch # type: ignore
import torchaudio # type: ignore
from flask import Flask, request, Response ,jsonify # type: ignore
from urllib.parse import quote
# 其他代码保持不变，保持原有结构
from cosyvoice.cli.cosyvoice import CosyVoice, CosyVoice2
from cosyvoice.utils.file_utils import load_wav
# import torchaudio.functional as F  # 新增导入


sys.path.append('third_party/Matcha-TTS')
torchaudio.set_audio_backend("sox_io")
app = Flask(__name__)

tempMap = {
    'default':'asset/zero_shot_prompt.wav',
    'nan_16k':'asset/cuishou_nan2_16k.wav',
    'nan2_16k':'asset/cuishou_nan2_16k.wav',
    'nv_16k':'asset/cuishou_nv2_16k.wav',
    'nv2_16k':'asset/cuishou_nv2_16k.wav',
    'jiuge_nv_16k':'asset/8616066708_16k_2.wav',
    'yuanlv_nv_16k':'asset/yuanlv_nv_16k_01.wav',
    'jiuge_nv_16k_02':'asset/jiuge_nv_16k_02.wav',
    'yizhi_bx_nv':'asset/yizhi_bx_nv_02.wav',
    'yuanlv_taikang_nv':'asset/yuanlv_taikang_nv.wav'
}
speedmap = {
    'yuanlv_nv_16k':1,
    'jiuge_nv_16k_02':1,
    'yizhi_bx_nv':1.1,
    'yuanlv_taikang_nv':1
}
promptMap = {
    'nv2_16k':'哦，您这边是忘记处理了是吧？那您这个一会儿是自己登录平台处理，还是说我们这边帮您划扣啊？奥，那您这边看好时间好吧？中午11点钟之前处理好哈，先生！',
    'nv_16k':'哦，您这边是忘记处理了是吧？那您这个一会儿是自己登录平台处理，还是说我们这边帮您划扣啊？奥，那您这边看好时间好吧？中午11点钟之前处理好哈，先生！',
    'nan2_16k':'你是不是无所谓嘛，我叫你尽快发一下，浪费你两分钟的时间，你这个连两分钟你都你都不愿意是吧？你非得我们这边走流程！那你那你发。。。那你刚你那两分钟你在干嘛呢? 我问你!',
    'nan_16k':'你是不是无所谓嘛，我叫你尽快发一下，浪费你两分钟的时间，你这个连两分钟你都你都不愿意是吧？你非得我们这边走流程！那你那你发。。。那你刚你那两分钟你在干嘛呢? 我问你!',
    'jiuge_nv_16k':'由于您现在已经进⼊逾期状态，为了避免产⽣不良记录，请您在两个⼩时内还清款项，我们也会持续和您保持联系的，感谢您的接听，再见。现在需要您⻢上处理⼀下这笔⽋款!',
    'yuanlv_nv_16k':'哎您好，打扰到您了，上次联系您的时候您的电话显示正忙哈，是这样子的，您的医社保之外做补充报销的资格是快要到期了，那您这边没有激活的话，以后生病住院责任内是没有办法申请报销的哈，您先不要挂电话，我再带您确认一下，好吧?',
    'jiuge_nv_16k_02':'诶您好。诶这里是专注家装20年的装修平台，额近期我们推出了免费量房、先装修后付款的活动，而且提供全程质检等服务，呵，装修品质有保障。',
    'yizhi_bx_nv':'嗯来电就是提醒您投宝领取一份医疗补充金,额稍后收到短信之后呢,直接确认免费领取就可以了。',
    'yuanlv_taikang_nv':'诶，您好，打扰到您了，上次联系您的时候，您的电话显示正忙哈，是这样子的，您的医社保之外做补充报销的资格是快要到期了，那您这边没有激活的话，以后生病住院责任内是没有办法申请报销的哈，您先不要挂电话，我再带您确认一下，好吧?'
}
cosyvoice = None
prompt_speech = None
model_name = 'iic/CosyVoice2-0.5B'
# model_name = '/home/jianglei/work/ts/CosyVoice/iic/CosyVoice2-0.5B'
target_sr = 16000
last_prompt_name = 'default'
def initialize():
    global prompt_speech
    global cosyvoice
    try:
        cosyvoice = CosyVoice2(model_name, load_jit=False, load_trt=False, fp16=False)
        # 确保 cosyvoice 初始化成功后再访问其属性
        if cosyvoice is not None:
            # assert cosyvoice.sample_rate == target_sr, "采样率不匹配"
            # 验证torchaudio支持的编码
            print('cosyvoice.sample_rate', cosyvoice.sample_rate)
            # assert cosyvoice.sample_rate in [16000], "模型采样率异常"
            print('torchaudio.get_audio_backend()', torchaudio.get_audio_backend())  # 应输出'sox_io'
            
            prompt_speech = load_prompt('default')  # 示例初始化操作
        else:
            raise RuntimeError("CosyVoice2 初始化失败，返回 None")
    except Exception as e:
        print(f"初始化 CosyVoice2 时出错: {e}")
        cosyvoice = None
        raise
def load_prompt(prompt_name='default'):
    global last_prompt_name, prompt_speech  # 添加此行
    if(prompt_name == last_prompt_name):
        print("使用缓存",prompt_speech)
        return prompt_speech
    last_prompt_name = prompt_name
    if prompt_name in tempMap:
        print(__name__,'prompt_name,tempMap[prompt_name]',prompt_name,tempMap[prompt_name])
        file_path = tempMap[prompt_name]
        current_dir = os.getcwd()
        if not os.path.exists(file_path):
            error_msg = f"提示音频文件不存在: {file_path},当前文件夹为: {current_dir}"
            print(error_msg)
            raise FileNotFoundError(error_msg) 
        prompt_speech = load_wav(file_path,target_sr)
        if prompt_speech is None:
            error_msg = f"音频文件加载失败: {file_path}"
            print(error_msg)
            raise RuntimeError(error_msg)
        return prompt_speech
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
def stream_audio(text_input, prompt, prompt_audio,speed):
    if cosyvoice is None:
        raise RuntimeError("CosyVoice2 未初始化或初始化失败")
    
    if prompt_audio is None:
        raise RuntimeError("提示音频数据为空，请检查音频文件是否存在")
    
    audio_tensors = []
    prompt_speech_16k = prompt_audio
    # 修改循环解包方式（关键点）
    for j in cosyvoice.inference_zero_shot(
        text_input, prompt, prompt_speech_16k, stream=False, speed=speed, text_frontend=True
    ):
        audio_tensors.append(j['tts_speech'])  # 直接访问字典
    
    combined_audio = torch.cat(audio_tensors, dim=-1)
    # 强制重采样刐16000
    # if cosyvoice.sample_rate != target_sr:
    #     combined_audio = F.resample(
    #         combined_audio,
    #         orig_freq=cosyvoice.sample_rate,
    #         new_freq=target_sr
    # )
    byte_io = io.BytesIO()
    print('combined_audio.shape',combined_audio.shape)
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


def check_gpu():
    if not torch.cuda.is_available():
        return False
    try:
        # 尝试分配显存（10MB）
        torch.ones((16, 16), device='cuda')
        return True
    except:
        return False
@app.route('/health')
def health_check():
    gpu_available=check_gpu()
    if(gpu_available):
        return jsonify(status="OK", msg=gpu_available),200 
    else:
        return jsonify(status="Error", message="GPU不可用"), 500
@app.route('/tts_stream')
def tts_stream():
    # try:
    text = request.args.get('text')
    if not text:
        return jsonify({"error": "缺少文本参数"}), 400
        
    prompt_name = request.args.get('prompt', 'default')

    prompt = promptMap.get(prompt_name, '') 
    if prompt_name not in tempMap:
        return jsonify({"error": f"无效的提示名称: {prompt_name}"}), 400
        
    prompt_speech = load_prompt(prompt_name)
        
    speed = speedmap.get(prompt_name,1.1)
    print('text->',text)
    print('prompt->',prompt)
    print('speed->',speed)
    audio_bytes = stream_audio(text, prompt,prompt_speech,speed)  # 修正参数传递
    # def generate_audio_stream(text, prompt, prompt_speech):
    #     for audio_chunk in stream_audio(text, prompt, prompt_speech):
    #         yield audio_chunk
        
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

if not hasattr(app, 'cosyvoice_initialized'):  # 防止重复初始化
    initialize()
    app.cosyvoice_initialized = True