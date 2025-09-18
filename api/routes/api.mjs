import 'date-utils';
import express from 'express';
import TTSClient from '../lib/TTS.mjs';
import { log } from 'console';
import fs from 'fs';
import pkg from 'wavefile';
import Consul from '../lib/consul.mjs';
const { WaveFile } = pkg;
const router = express.Router();
const EXPIRE_TIME = 1 * 60 * 1000; //一分钟过期
const CONSUL_SERVICE = 'cosy-service';
let COSY_SERVICE_LAST_UPDATE = new Date().getTime();
/* GET users listing. */
router.get('/tts', async function (req, res, next) {
  const fn = 'api/tts->';
  const ttsClient = new TTSClient();
  const consul = new Consul();
  const now = new Date().getTime();
  log(
    fn,
    'now:',
    [new Date(now).toFormat('YYYY-MM-DD HH24:MI:SS')],
    'COSY_SERVICE_LAST_UPDATE',
    [new Date(COSY_SERVICE_LAST_UPDATE).toFormat('YYYY-MM-DD HH24:MI:SS')],
    'EXPIRE_TIME',
    EXPIRE_TIME
  );
  log(fn, 'now - COSY_SERVICE_LAST_UPDATE', now - COSY_SERVICE_LAST_UPDATE);

  if (now - COSY_SERVICE_LAST_UPDATE > EXPIRE_TIME) {
    log(fn, 'COSY_SERVICE_LAST_UPDATE 过期，重新初始化');
    COSY_SERVICE_LAST_UPDATE = now;
    try {
      let serviceName = CONSUL_SERVICE;
      await consul.refreshTTLCheckByServiceName(serviceName, Consul.status.pass);
    } catch (error) {
      console.error(fn, '获取检查项失败:', error);
    }
  } else {
    log(fn, 'COSY_SERVICE_LAST_UPDATE 未过期，不重新初始化');
    COSY_SERVICE_LAST_UPDATE = now;
  }

  let { text, prompt } = req.query;
  if (!text) {
    res.json({
      code: 500,
      msg: 'text is required',
      data: null,
    });
    return;
  }
  prompt = prompt || 'default';
  // prompt = 'jiuge_nv_16k';

  // res.json({ OK: 1 })

  let emptyStr = text.replace(/[,*_\/-\s]/g, ''); // 过滤特殊字符
  if (emptyStr.length < 1) {
    res.json({
      code: 200,
      msg: 'text is empty',
      data: fs.readFileSync('./data/wav/empty.wav').toString('base64'),
    });
    return;
  }

  log(fn, 'text', text);
  let silence = /\|\d\|/g.exec(text);
  let texts = [];
  if (!silence) {
    //没有需要停顿的
    texts = [text];
  } else {
    texts = text.split('|');
    texts = texts.filter((item) => item.trim() !== '');
  }

  try {
    let data = [];
    let i = 10;
    // log('->'.repeat(50));
    // log(texts);
    // log('<-'.repeat(50));

    for (let text of texts) {
      log(fn, 'text', text);
      i++;
      if (/^\d$/.test(text)) {
        let _data = TTSClient.genEmptyWav(text);
        data.push(_data);
        // log(_data);
      } else {
        let arrayBuffer = await ttsClient.generateAudio(text, prompt);
        // let arrayBuffer = await ttsClient.generateAudioParallel(text, prompt);
        let _data = new WaveFile(Buffer.from(arrayBuffer));
        data.push(_data);
        fs.writeFileSync(`./data/wav/${i}.wav`, _data.toBuffer());
      }
    }
    // log('<-'.repeat(50));

    // log(fn, 'data', data);
    let wav = TTSClient.mergeAudio(data);
    if (!wav) {
      res.json({
        code: 500,
        msg: '音频生成失败,wav文件没有生成',
        data: null,
      });
      return;
    }
    let buffer = Buffer.from(wav);
    let data8k = await ttsClient.convertSampleRate(buffer);
    let base64data = Buffer.from(data8k).toString('base64');
    res.json({
      code: 200,
      msg: 'success',
      data: base64data,
    });
  } catch (error) {
    console.error('音频生成失败:', error.message);
    res.json({
      code: 500,
      msg: error.message,
      data: null,
    });
  }
});

export { router as apiRouter };
