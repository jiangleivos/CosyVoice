import fetch from "node-fetch";
import { log } from "console";
import fs from 'fs'
let url = 'http://192.168.1.116:3100/api/tts?text='
let text = '不好意思，这边就不打扰您了,祝您生活愉快，再见！'
let res = await fetch(url + text, {
  "method": "GET",
  "headers": {}
})

let json = await res.json()

let file = './data/wav/test.wav'
fs.writeFileSync(file, json.data, 'base64')

log(file)
// log(json)
// .then((res) => res.text())
// .then(console.log.bind(console))
// .catch(console.error.bind(console));
