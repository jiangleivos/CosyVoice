import sys
import io
sys.path.append('third_party/Matcha-TTS')
from cosyvoice.cli.cosyvoice import CosyVoice, CosyVoice2
from cosyvoice.utils.file_utils import load_wav
import torchaudio

cosyvoice = CosyVoice2('iic/CosyVoice2-0.5B', load_jit=False, load_trt=False, fp16=False)


tempMap = {
    'demo':'asset/cross_lingual_prompt.wav',
}
# NOTE if you want to reproduce the results on https://funaudiollm.github.io/cosyvoice2, please add text_frontend=False during inference
# zero_shot usage
prompt_speech_16k = load_wav('asset/zero_shot_prompt.wav', 16000)
# prompt_speech_16k = load_wav('asset/cross_lingual_prompt.wav', 16000)
for i, j in enumerate(cosyvoice.inference_zero_shot('收到好友从远方寄来的生日礼物，那份意外的惊喜与深深的祝福让我心中充满了甜蜜的快乐，笑容如花儿般绽放。', '希望你以后能够做的比我还好呦。', prompt_speech_16k, stream=False)):
    print(i,format(i))
    print(j,j['tts_speech'])
    print (cosyvoice.sample_rate )
    torchaudio.save('asset/zero_shot_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)

# fine grained control, for supported control, check cosyvoice/tokenizer/tokenizer.py#L248
for i, j in enumerate(cosyvoice.inference_cross_lingual('在他讲述那个荒诞故事的过程中，他突然[laughter][laughter][laughter]停下来，因为他自己也被逗笑了[laughter]。', prompt_speech_16k, stream=False)):
    torchaudio.save('asset/fine_grained_control_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)

# instruct usage
for i, j in enumerate(cosyvoice.inference_instruct2('收到好友从远方寄来的生日礼物，那份意外的惊喜与深深的祝福让我心中充满了甜蜜的快乐，笑容如花儿般绽放。', '用四川话说这句话', prompt_speech_16k, stream=False)):
    torchaudio.save('asset/instruct_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)

# bistream usage, you can use generator as input, this is useful when using text llm model as input
# NOTE you should still have some basic sentence split logic because llm can not handle arbitrary sentence length
# def text_generator():
#     yield '收到好友从远方寄来的生日礼物，'
#     yield '那份意外的惊喜与深深的祝福'
#     yield '让我心中充满了甜蜜的快乐，'
#     yield '笑容如花儿般绽放。'
# for i, j in enumerate(cosyvoice.inference_zero_shot(text_generator(), '希望你以后能够做的比我还好呦。', prompt_speech_16k, stream=False)):
#     torchaudio.save('asset/zero_shot_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)

def stream_audio(text_input, prompt_text, prompt_audio):
    buffer = io.BytesIO()
    for i, j in enumerate(cosyvoice.inference_zero_shot(
        text_input,          # 输入文本（支持字符串或生成器）
        prompt_text,         # 提示文本
        prompt_audio,        # 提示音频（16kHz）
        stream=True          # 启用流式输出
    )):
        # 将当前音频块保存为WAV格式
        torchaudio.save(
            buffer,
            j['tts_speech'],
            format="wav",
            sample_rate=cosyvoice.sample_rate
        )
        
        # 生成二进制音频流并返回
        yield buffer.getvalue()
        
        # 重置缓冲区
        buffer.seek(0)
        buffer.truncate()


if __name__ == "__main__":
    # 输入文本示例
    text = "收到好友从远方寄来的生日礼物，那份意外的惊喜与深深的祝福让我心中充满了甜蜜的快乐，笑容如花儿般绽放。"
    prompt = "希望你以后能够做的比我还好呦。"

    # 调用流式接口
    audio_stream = stream_audio(
        text,
        prompt,
        prompt_speech_16k  # 需提前加载的提示音频
    )

    # 处理流数据（如保存或传输）
    for chunk in audio_stream:
        # 可在此处：
        # 1. 保存到文件
        # 2. 通过网络传输
        # 3. 实时播放
        print(f"Received audio chunk {len(chunk)} bytes")