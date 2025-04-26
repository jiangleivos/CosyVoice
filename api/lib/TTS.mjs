// api/lib/TTS.mjs
import fs from 'fs';
import fetch from 'node-fetch'; // 使用 node-fetch 代替 axios
import { log } from 'console'
import { execFile } from 'child_process';
const DOMAIN = 'http://192.168.3.168'

class TTSClient {
  // 在 TTSClient 类中添加以下方法：
  async convertSampleRate(data, targetRate = 8000) {

    return new Promise((resolve, reject) => {
      // 使用FFmpeg通过管道处理数据
      const ffmpeg = execFile('ffmpeg', [
        '-f', 'wav',          // 指定输入格式为WAV
        '-i', 'pipe:0',       // 从标准输入读取
        '-ar', targetRate,    // 目标采样率
        '-f', 'wav',          // 输出格式保持WAV
        '-map_metadata', '-1 ',// 去除元数据 
        'pipe:1'              // 输出到标准输出
      ], {
        maxBuffer: 1024 * 1024 * 10, // 增大缓冲区处理大文件
        encoding: null // 关键修改：强制二进制模式

      });

      // 写入输入数据到FFmpeg进程
      ffmpeg.stdin.write(data);
      ffmpeg.stdin.end();

      const chunks = [];
      ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
      ffmpeg.stderr.on('data', err => console.error(err));

      ffmpeg.on('close', code => {
        if (code === 0) {
          resolve(Buffer.concat(chunks)); // 合并输出流为Buffer
        } else {
          reject(new Error(`FFmpeg转换失败: ${code}`));
        }
      });
    });
  }
  constructor(ports = [5001, 5002, 5003, 5004]) {
    this.ports = ports;
    this.portQueue = [...ports]; // 初始化端口队列
  }

  // 修改后的 generateAudio 方法
  async generateAudio(text, prompt) {
    const fn = 'generateAudio';
    while (this.portQueue.length > 0) {
      const port = this.portQueue.shift();
      const url = `${DOMAIN}:${port}/tts_stream`;

      // 构造查询参数
      const params = new URLSearchParams({ text, prompt });
      const fullUrl = `${url}?${params}`;
      log(fn, 'fullUrl', fullUrl)
      try {
        // 使用 fetch 发送请求
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // 获取二进制数据
        const data = await response.arrayBuffer();
        // fs.writeFileSync(outputPath, Buffer.from(data));
        this.portQueue.push(port);
        return data

        // return true;

      } catch (error) {
        console.error(`Port ${port} failed: ${error.message}`);
        this.portQueue.push(port);
        return null
      }
    }

    throw new Error('所有TTS服务均不可用');
  }
}

export default TTSClient;

const main = async () => {
  let cmd = process.argv[2];
  switch (cmd) {
    case 'test':
      const ttsClient = new TTSClient();
      const text = '张先生，我是迈泉平台贷后管理专员，工号八一六六。关于您名下逾期欠款12,350元，系统显示您已连续拖欠63天。今天致电是最后一次提醒：今天下午6点前必须全额结清，否则将进入正式流程，后果由您自行承担。';
      // const prompt = 'nan_16k';
      const prompt = 'nv_16k';


      try {
        // let data = await ttsClient.generateAudio(text, prompt);
        // const outputPath = './data/wav/output.wav';
        // fs.writeFileSync(outputPath, Buffer.from(data));
        // console.log('音频生成成功:', outputPath);

        let data = await ttsClient.generateAudio(text, prompt);
        let buffer = Buffer.from(data);
        // 内存转换采样率
        data = await ttsClient.convertSampleRate(buffer);
        const outputPath = './data/wav/output_8k.wav';
        fs.writeFileSync(outputPath, data); // 最终保存到文件
        console.log('8kHz音频生成成功:', outputPath);
      } catch (error) {
        console.error('音频生成失败:', error.message);
      }
      break;
    default:
      console.log('无效命令');
      break;
  }

}
main()