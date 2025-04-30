import express from 'express';
import TTSClient from '../lib/TTS.mjs';
import { log } from 'console';
import fs from 'fs'
import pkg from 'wavefile';
const { WaveFile } = pkg;
const router = express.Router();
const ttsClient = new TTSClient();
/* GET users listing. */
router.get('/tts', async function (req, res, next) {
  const fn = 'api/tts->';
  let { text, prompt } = req.query;
  if (!text) {
    res.json({
      code: 500,
      msg: 'text is required',
      data: null
    })
    return
  }
  // prompt = prompt || 'default'
  prompt = 'jiuge_nv_16k'

  // res.json({ OK: 1 })

  let emptyStr = text.replace(/[,*_\/-\s]/g, ''); // 过滤特殊字符
  if (emptyStr.length < 1) {
    res.json({
      code: 200,
      msg: 'text is empty',
      data: fs.readFileSync('./data/wav/empty.wav').toString('base64')
    })
    return
  }

  log(fn, 'text', text);
  let silence = /\|\d\|/g.exec(text);
  let texts = []
  if (!silence) {//没有需要停顿的
    texts = [text]
  } else {
    texts = text.split('|')
  }

  log(fn, 'texts', texts);

  try {
    let data = [];
    let i = 10;
    for (let text of texts) {
      log(fn, 'text', text);
      i++
      if (/^\d$/.test(text)) {
        let _data = TTSClient.genEmptyWav(text);
        data.push(_data);
      } else {
        let arrayBuffer = await ttsClient.generateAudio(text, prompt);
        let _data = new WaveFile(Buffer.from(arrayBuffer));
        data.push(_data);
        fs.writeFileSync(`./data/wav/${i}.wav`, _data.toBuffer());
      }
    }

    // log(fn, 'data', data);
    let wav = TTSClient.mergeAudio(data);
    if (!wav) {
      res.json({
        code: 500,
        msg: '音频生成失败',
        data: null
      })
      return
    }
    let buffer = Buffer.from(wav);
    let data8k = await ttsClient.convertSampleRate(buffer);
    let base64data = Buffer.from(data8k).toString('base64');
    res.json({
      code: 200,
      msg: 'success',
      data: base64data
    })
  } catch (error) {
    console.error('音频生成失败:', error.message);
    res.json({
      code: 500,
      msg: error.message,
      data: null
    })
  }
});


export { router as apiRouter };
