import fetch from 'node-fetch';
import { log, time, timeLog, timeEnd } from 'console';
import fs from 'fs';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let url = 'http://192.168.1.116:3100/api/tts';
// let url = 'http://localhost:3100/api/tts';
// let text =
// '需要您现在马上处理一下这笔欠款。感谢您的配合。如果已经对公还款，|3|请致电客服确保⼊账成功，我稍后也会在后台核实您的还款状态。如果没有准时到帐，我会再次联系您的,再见！';
let text =
  '诶您好，这里是专注家装二十年的装修平台，目前我们推出了免费梁房、先装修后付款的活动，请问您近期有装修房子的打算吗？';
text =
  '诶 您好。|2|哎您好，打扰到您了，上次联系您的时候您的电话显示正忙哈，是这样子的，您的医社保之外做补充报销的资格是快要到期了，那您这边没有激活的话，以后生病住院责任内是没有办法申请报销的哈，您先不要挂电话，我再带您确认一下好吧?';
// '喂你好|2|您好，迟女士，我这边是微博借钱的，之前联系过您，您的逾期欠款到目前为止怎么还没有处理呢？';
text =
  '诶，您好，打扰到您了，上次联系您的时候，您的电话显示正忙哈，额是这样子的，您的医社保之外做补充报销的资格是快要到期了，那您这边没有激活的话，以后生病住院责任内是没有办法申请报销的哈，您先不要挂电话，我再带您确认一下，好吧? 嗯，如果没有特殊要求的话，以后我就用这个声音打电话您听一下是否可以哈？';

let template = [
  '您好，迟女士，我这边是微博借钱的，之前联系过您，您的逾期欠款到目前为止怎么还没有处理呢？',
  '喂你好|2|您好，迟女士，我这边是微博借钱的，之前联系过您，您的逾期欠款到目前为止怎么还没有处理呢？',
];
let textArr = [];
for (let i = 0; i < 20; i++) {
  textArr.push(template[i % template.length]);
}

const taskrun = (arr, maxparallel = 1) => {
  return new Promise((resolve, reject) => {
    const fn = 'taskrun->';
    const result = [];
    let nextIndx = 0;
    let finishCount = 0;
    const _run = async () => {
      const fn = '_run->';
      log(fn, 'nextIndx', nextIndx, 'arr.length', arr.length);
      if (nextIndx >= arr.length) {
        log(fn, '任务全部开始执行了');
        return;
      }
      // 添加随机延迟（例如100ms到1000ms之间）
      if (nextIndx > 0) {
        // 第一个任务不需要延迟
        const randomDelay = Math.floor(Math.random() * 200) + 100; // 100-300ms随机延迟
        // const randomDelay = 50;
        await wait(randomDelay);
      }
      let pos = nextIndx;
      let qs = new URLSearchParams({ text: arr[nextIndx++] });
      let res = await fetch(url + '?' + qs.toString(), {
        method: 'GET',
        headers: {},
      });
      let json = await res.json();
      timeLog('cosy');
      finishCount++;
      result[pos] = json;

      log(fn, 'pos', pos, 'result.length', result.length, finishCount, 'arr.length', arr.length);
      log(fn, 'json.code', json.code);
      if (json.code !== 200) {
        log(fn, '任务执行失败', [json.msg]);
        fail++;
        // reject(new Error(json.msg));
        // return;
      } else {
        log(fn, '任务执行成功', [json.msg]);
        succ++;
      }

      if (finishCount >= arr.length) {
        log(fn, '所有任务完成');
        resolve(result);
        return;
      }
      _run();
    };

    for (let i = 0; i < maxparallel; i++) {
      _run().catch((err) => {
        log(fn, '任务执行出错', err);
        reject(err);
      });
    }
  });
};
let succ = 0;
let fail = 0;
const main = async () => {
  let cmd = process.argv[2];
  switch (cmd) {
    case 't':
      {
        time('cosy');
        // 创建并发任务函数
        try {
          let parallel = 1;
          let rst = await taskrun(textArr, parallel);
          log('rst', rst.length, 'succ', succ, 'fail', fail);
        } catch (error) {
          log('error', error);
        } finally {
          timeLog('cosy');
        }

        // 创建并发池
        // for (let i = 0; i < textArr.length; i++) {
        //   const task = runTask(textArr[i]);
        //   taskPool.push(task);
        //   // 当并发池达到上限时等待
        //   if (taskPool.length >= concurrency) {
        //     log(taskPool.length);
        //     // await Promise.race(taskPool);
        //   }
        // }

        // 等待所有任务完成
        // results = await Promise.all(taskPool);
      }
      break;
    case 'tts2':
      {
        let conf = {
          loan_platform: '新浪',
          name: '王某某',
          sex: '先生',
          overdue_days: '2',
          hotline: '4001234567',
        };
        text = text.replace(/\{(.*?)\}/g, (match, key) => {
          return conf[key] || match;
        });
        log('text', text);
        let parallel = [
          fetch(url + text, {
            method: 'GET',
            headers: {},
          }),
          fetch(url + text, {
            method: 'GET',
            headers: {},
          }),
        ];
        let res = await Promise.all(parallel);
        // let res = await fetch(url + text, {
        //   method: 'GET',
        //   headers: {},
        // });
        let jsons = await Promise.all(res.map((r) => r.json()));
        log('jsons', jsons.length);
      }
      break;
    case 'tts':
      {
        let conf = {
          loan_platform: '新浪',
          name: '王某某',
          sex: '先生',
          overdue_days: '2',
          hotline: '4001234567',
        };
        text = text.replace(/\{(.*?)\}/g, (match, key) => {
          return conf[key] || match;
        });
        log('text', text);
        // let text = '再见'
        // let text = '我们也能理解您现在的处境'
        let prompt = 'jiuge_nv_16k_02';
        prompt = 'yuanlv_nv_16k';
        prompt = 'yizhi_bx_nv';
        prompt = 'yuanlv_taikang_nv';
        let qs = new URLSearchParams({ text, prompt });
        let res = await fetch(url + '?' + qs.toString(), {
          method: 'GET',
          headers: {},
        });

        console.time('cosy-tts');
        let json = await res.json();
        // log(json)
        let file = `./data/wav/test${new Date().getTime()}.wav`;
        if (json.data) {
          fs.writeFileSync(file, json.data, 'base64');
          log('file', file);
        } else {
          log('error', json);
        }

        console.timeEnd('cosy-tts');
      }
      break;
  }
  // let res = await fetch(url + text, {
  //   method: 'GET',
  //   headers: {},
  // });
  // let json = await res.json();
  // log(json);
};

main();
// execSync('open ' + file);
// log(json)
// .then((res) => res.text())
// .then(console.log.bind(console))
// .catch(console.error.bind(console));
