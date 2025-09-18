// api/lib/TTS.mjs
import fs from 'fs';
import fetch from 'node-fetch'; // 使用 node-fetch 代替 axios
import { log } from 'console';
import { execFile, execFileSync, execSync } from 'child_process';
// import { WaveFile } from 'wavefile'; // 引入 wavefile 库
import pkg from 'wavefile';
import Consul from './consul.mjs'; // 引入 Consul 类
const { WaveFile } = pkg;
const DOMAIN = 'http://192.168.1.88';
// const DOMAIN = 'http://frpc.ballge.cn';

const CONSUL_SERVICE = 'cosy-service';

class TTSClient {
  /**
   * 合并两个wav文件
   * @param {Array} wavList wav文件列表
   */
  static mergeAudio_bak(wavList) {
    const fn = 'mergeAudio->';
    if (wavList.length === 0) return null;

    // **1. 格式验证：确保所有音频参数一致**
    const firstWav = wavList[0];
    wavList.forEach((wav) => {
      log(fn, 'wav.fmt', wav.fmt);
      if (
        wav.fmt.sampleRate !== firstWav.fmt.sampleRate ||
        wav.fmt.bitsPerSample !== firstWav.fmt.bitsPerSample ||
        wav.fmt.numChannels !== firstWav.fmt.numChannels
      ) {
        throw new Error('所有音频文件的格式必须一致');
      }
    });

    // **2. 合并样本数据**
    const sampleType = {
      8: Int8Array,
      16: Int16Array,
      32: Int32Array,
    }[firstWav.fmt.bitsPerSample];

    const totalSamples = wavList.reduce((sum, wav) => sum + wav.data.samples.length, 0);
    const mergedSamples = new sampleType(totalSamples);

    let index = 0;
    for (const wav of wavList) {
      const samples = wav.data.samples;
      for (let i = 0; i < samples.length; i++) {
        mergedSamples[index++] = samples[i];
      }
    }

    // **3. 创建合并后的 WaveFile 对象**
    const mergedWav = new WaveFile();
    mergedWav.fromScratch(firstWav.fmt.numChannels, firstWav.fmt.sampleRate, firstWav.fmt.bitsPerSample, mergedSamples);

    log(fn, '合并成功:', mergedWav.toBuffer().length);
    return mergedWav.toBuffer(); // 返回合并后的 Buffer
  }
  static mergeAudio(wavList) {
    const fn = 'mergeAudio->';
    const baseDir = './data/wav'; // 基础路径
    let files = [];

    try {
      // 写入临时文件到 baseDir 目录
      for (let i = 0; i < wavList.length; i++) {
        const wav = wavList[i];
        const fileName = `${i}.wav`;
        const file = `${baseDir}/${fileName}`;
        log(fn, 'fileName', fileName);
        fs.writeFileSync(file, wav.toBuffer());
        files.push(fileName); // 仅保存文件名（不带路径）
        log(fn, 'file', file);
      }

      // 生成 lists.txt 内容，使用相对路径
      const listContent = files.map((f) => `file '${f}'`).join('\n');
      const listPath = `${baseDir}/lists.txt`;
      fs.writeFileSync(listPath, listContent);

      // 执行 FFmpeg 合并命令，确保路径正确
      execFileSync('ffmpeg', [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath, // 直接使用相对路径
        '-map_metadata',
        '-1',
        // '-c', 'copy',
        `${baseDir}/mergeWav.wav`,
      ]);
      log(fn, 'listPath', listPath);
      let buffer = fs.readFileSync(`${baseDir}/mergeWav.wav`);
      return buffer;
      // log(fn, 'buffer.length', buffer.length)
      // let mergedwav = new WaveFile(buffer);
      // log(fn, '合并成功:', mergedwav.toBuffer().length);
      // return mergedwav
    } catch (err) {
      console.error('合并失败:', err.message);
      throw err;
    }
  }
  /**
   *
   * @param {Int} seconds
   * @param {Wav} wav
   * @param {*} options
   */
  // 在 TTSClient 类中添加静态方法
  static genEmptyWav(seconds, options = {}) {
    seconds = +seconds;
    const {
      sampleRate = 16000, // 默认24kHz采样率
      bitDepth = 16, // 默认32位深度
      numChannels = 1, // 默认单声道
    } = options;

    // 关键修复：样本总数 = 采样率 × 秒数 × 声道数
    const totalSamples = sampleRate * seconds * numChannels; // 新增 ×numChannels
    let silentData;
    switch (bitDepth) {
      case 8:
        silentData = new Int8Array(totalSamples).fill(0);
        break;
      case 16:
        silentData = new Int16Array(totalSamples).fill(0);
        break;
      case 24:
        // 24位需要特殊处理（无对应 TypedArray）
        throw new Error('24-bit WAV 不支持');
      case 32:
        silentData = new Int32Array(totalSamples).fill(0);
        break;
      default:
        throw new Error('无效位深');
    }

    const wav = new WaveFile();
    wav.fromScratch(
      numChannels,
      sampleRate,
      bitDepth,
      silentData // 直接传递 TypedArray
    );
    console.log('静音文件已生成:');
    return wav;
    // return wav
    // 写入文件
    // fs.writeFileSync(outputPath, wav.toBuffer());
  }
  async convertSampleRate(data, targetRate = 8000) {
    const fn = 'convertSampleRate->';
    let orighinWav = './data/wav/origin.wav';
    let targetWav = './data/wav/target8K.wav';
    fs.writeFileSync(orighinWav, data);
    execFileSync('ffmpeg', [
      '-y',
      '-i',
      orighinWav,
      '-ar',
      targetRate,
      '-ac',
      '1',
      '-f',
      'wav',
      '-map_metadata',
      '-1',
      targetWav,
    ]);
    // 读取转换后的文件
    if (fs.existsSync(targetWav)) {
      const convertedData = fs.readFileSync(targetWav);
      // 删除临时文件
      // fs.unlinkSync(orighinWav);
      // fs.unlinkSync(targetWav);
      log(fn, '转换后的文件大小', convertedData.length);
      return convertedData;
    } else {
      console.error(fn, '转换后的文件不存在');
      return null;
    }
  }
  // 在 TTSClient 类中添加以下方法：
  async convertSampleRate_bak(data, targetRate = 8000) {
    return new Promise((resolve, reject) => {
      // 使用FFmpeg通过管道处理数据
      const ffmpeg = execFile(
        'ffmpeg',
        [
          // '-f', 'wav',          // 指定输入格式为WAV
          '-y',
          '-i',
          'pipe:0', // 从标准输入读取
          '-ar',
          targetRate, // 目标采样率
          '-ac',
          '1', // 单声道
          '-f',
          'wav', // 输出格式保持WAV
          '-map_metadata',
          '-1', // 关键修正：清除元数据（移除多余的空格）
          'pipe:1', // 输出到标准输出
        ],
        {
          maxBuffer: 1024 * 1024 * 30, // 增大缓冲区处理大文件
          encoding: null, // 关键修改：强制二进制模式
        }
      );

      // 写入输入数据到FFmpeg进程
      ffmpeg.stdin.write(data);
      ffmpeg.stdin.end();

      const chunks = [];
      ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (err) => console.error(err));

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks)); // 合并输出流为Buffer
        } else {
          reject(new Error(`FFmpeg转换失败: ${code}`));
        }
      });
    });
  }
  constructor(ports = [5001, 5002, 5003, 5004]) {
    this.consul = new Consul();
    this.ports = ports;
    this.taskQueue = [];
    this.portQueue = [...ports]; // 初始化端口队列
    this.consul_service = CONSUL_SERVICE;
  }
  async getAvailableServices() {
    const fn = 'getAvailableServices->';
    try {
      log(fn, 'this.consul_service', this.consul_service);
      const services = await this.consul.getHealthyService(this.consul_service);
      //乱序services
      services.sort(() => Math.random() - 0.5);
      log(fn, '可用服务:', services);
      return services;
    } catch (error) {
      console.error(fn, '获取可用服务失败:', error.message);
    }
  }

  // 新增：并行生成音频
  async generateAudioParallel(text, prompt) {
    const fn = 'generateAudioParallel->';
    let nodes = await this.getAvailableServices();
    let services = nodes.map((node) => node.Service);
    for (let service of services) {
      let { Address: addr, Port: port, Meta: meta, ID: id } = service;
      log(fn, 'addr', addr, 'port', port, 'meta', meta, 'id', [id], 'length', services.length);
      if (meta.status !== 'ready') continue;
      // log(fn, '准备添加到任务队列', service);
      this.taskQueue.push({
        addr,
        port,
        id,
      });
      break;
    }
    if (this.taskQueue.length > 0) {
      const { addr, port, id } = this.taskQueue.shift();
      const url = `http://${addr}:${port}/tts_stream`;

      log(fn, 'new URLSearchParams({ text, prompt })', text, prompt);
      log(fn, '-->'.repeat(20), 'url', url);
      // 构造查询参数
      const params = new URLSearchParams({ text, prompt });
      const fullUrl = `${url}?${params}`;
      log(fn, 'fullUrl', fullUrl);
      try {
        await this.consul.lockService(id);
        // await this.consul.updateServiceMeta(id, { status: 'processing' }); // 更新服务状态为处理中
        // 使用 fetch 发送请求
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // await this.consul.updateServiceMeta(id, { status: 'ready' }); // 更新服务状态为错误
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // 获取二进制数据
        const data = await response.arrayBuffer();
        let buf = Buffer.from(data);
        // fs.writeFileSync(outputPath, Buffer.from(data));
        // this.portQueue.push(port);
        // this.taskQueue.push({ addr, port }); // 将端口重新加入队列

        return buf;

        // return true;
      } catch (error) {
        console.error(`Port ${port} failed: ${error.message}`);
        // this.taskQueue.push({ addr, port });
        // this.portQueue.push(port);
        return null;
      } finally {
        await this.consul.unlockService(id);
        // await this.consul.updateServiceMeta(id, { status: 'ready' }); // 确保最终状态更新为 ready
        // this.portQueue.push(port);
      }
    } else {
      throw new Error('所有TTS服务暂时没有多余并发');
    }
  }
  // 修改后的 generateAudio 方法
  async generateAudio(text, prompt) {
    const fn = 'generateAudio';
    while (this.portQueue.length > 0) {
      const port = this.portQueue.shift();
      const url = `${DOMAIN}:${port}/tts_stream`;

      log(fn, 'new URLSearchParams({ text, prompt })', text, prompt);
      log(fn, '-->'.repeat(20), 'url', url);
      // 构造查询参数
      const params = new URLSearchParams({ text, prompt });
      const fullUrl = `${url}?${params}`;
      log(fn, 'fullUrl', fullUrl);
      try {
        // 使用 fetch 发送请求
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // 获取二进制数据
        const data = await response.arrayBuffer();
        let buf = Buffer.from(data);
        // fs.writeFileSync(outputPath, Buffer.from(data));
        this.portQueue.push(port);
        return buf;

        // return true;
      } catch (error) {
        console.error(`Port ${port} failed: ${error.message}`);
        this.portQueue.push(port);
        return null;
      }
    }

    throw new Error('所有TTS服务均不可用');
  }
}

export default TTSClient;

const main = async () => {
  const fn = 'main->';
  let cmd = process.argv[2];
  switch (cmd) {
    case 'mc':
      {
        // 处理 miro-service 相关逻辑
        const ttsClient = new TTSClient();
        const text =
          '张先生，我是迈泉平台贷后管理专员，工号八一六六。关于您名下逾期欠款12,350元，系统显示您已连续拖欠63天。今天致电是最后一次提醒：今天下午6点前必须全额结清，否则将进入正式流程，后果由您自行承担。';
        // const prompt = 'nan_16k';
        const prompt = 'jiuge_nv_16k';

        try {
          // let data = await ttsClient.generateAudio(text, prompt);
          // const outputPath = './data/wav/output.wav';
          // fs.writeFileSync(outputPath, Buffer.from(data));
          // console.log('音频生成成功:', outputPath);

          let data = await ttsClient.generateAudioParallel(text, prompt);
          // let buffer = Buffer.from(data);
          // 内存转换采样率
          // data = await ttsClient.convertSampleRate(buffer);
          // const outputPath = './data/wav/output_8k.wav';
          // fs.writeFileSync(outputPath, data); // 最终保存到文件
          // console.log('8kHz音频生成成功:', outputPath);
        } catch (error) {
          console.error('音频生成失败:', error.message);
        }
      }
      break;
    case 'merge':
      {
        let wav1 = new WaveFile(fs.readFileSync('./data/wav/1.wav'));
        let wav2 = new WaveFile(fs.readFileSync('./data/wav/2.wav'));
        let wav = TTSClient.mergeAudio([wav1, wav2]);
        let mergeWav = './data/wav/mergeWav.wav';
        // log('wav1.fmt', wav1.fmt, 'wav2.fmt', wav2.fmt)
        // log('wav.fmt', wav.fmt)
        // log('wav.toBuffer().length', wav.toBuffer().length)
        return;
        // fs.writeFileSync(mergeWav, wav.toBuffer());
        // const mergedFmt = wav.fmt;
        // console.log('mergedFmt:', {
        //   chunkSize: mergedFmt.chunkSize,
        //   cbSize: mergedFmt.cbSize,
        //   dwChannelMask: mergedFmt.dwChannelMask,
        // });
        // log(fn, 'mergetWav', mergeWav);
      }
      break;
    case 'empty':
      {
        let wav = TTSClient.genEmptyWav('3');
        // log(wav)
        let empty = './data/wav/emptyWav.wav';
        fs.writeFileSync(empty, wav.toBuffer());
        log(wav.data.samples.length);
        log(fn, 'empty', empty);

        // const ttsClient = new TTSClient();
      }
      break;
    case 'test':
      const ttsClient = new TTSClient();
      const text =
        '张先生，我是迈泉平台贷后管理专员，工号八一六六。关于您名下逾期欠款12,350元，系统显示您已连续拖欠63天。今天致电是最后一次提醒：今天下午6点前必须全额结清，否则将进入正式流程，后果由您自行承担。';
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
      // console.log('无效命令');
      break;
  }
};
main();
