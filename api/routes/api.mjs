import express from 'express';
import TTSClient from '../lib/TTS.mjs';
import { log } from 'console';
import fs from 'fs'
const router = express.Router();
const ttsClient = new TTSClient();
/* GET users listing. */
router.get('/tts', async function (req, res, next) {
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
  prompt = 'nv_16k'

  let emptyStr = text.replace(/[,*_\/-\s]/g, ''); // 过滤特殊字符
  if (emptyStr.length < 1) {
    res.json({
      code: 200,
      msg: 'text is empty',
      data: fs.readFileSync('./data/wav/empty.wav').toString('base64')
    })
    return
  }

  try {
    let data = await ttsClient.generateAudio(text, prompt);
    if (!data) {
      res.json({
        code: 500,
        msg: '音频生成失败',
        data: null
      })
      return
    }
    let buffer = Buffer.from(data);
    let data8k = await ttsClient.convertSampleRate(buffer);
    log('data8k', data8k.length);
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
