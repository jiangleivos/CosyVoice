import fetch from "node-fetch";
import { log } from "console";
import fs from 'fs'
let url = 'http://192.168.1.116:3100/api/tts?text='
// let url = 'http://localhost:3100/api/tts?text='
let text = '需要您现在马上处理一下这笔欠款。感谢您的配合。如果已经对公还款，|3|请致电客服确保⼊账成功，我稍后也会在后台核实您的还款状态。如果没有准时到帐，我会再次联系您的,再见！'
// let text = '再见'
// let text = '我们也能理解您现在的处境'
let res = await fetch(url + text, {
  "method": "GET",
  "headers": {}
})

let json = await res.json()
// log(json)

let file = `./data/wav/test${new Date().getTime()}.wav`
if (json.data) {
  fs.writeFileSync(file, json.data, 'base64')
  log('file', file)
} else {
  log('error', json)
}
// execSync('open ' + file);
// log(json)
// .then((res) => res.text())
// .then(console.log.bind(console))
// .catch(console.error.bind(console));
