#!/usr/bin/env node

import TTSClient from '../lib/TTS.mjs';
import { log } from 'console';
import fs from 'fs';

/**
 * 简单的服务测试
 */
async function simpleServiceTest() {
  const fn = 'simpleServiceTest->';
  console.log('🎯 开始简单服务测试...');

  try {
    const ttsClient = new TTSClient();
    const testText = '测试';
    const testPrompt = 'default';

    console.log(`${fn} 📝 测试文本: "${testText}"`);
    console.log(`${fn} 🎵 测试音色: "${testPrompt}"`);

    const startTime = Date.now();
    const audioBuffer = await ttsClient.generateAudio(testText, testPrompt);
    const endTime = Date.now();

    if (audioBuffer && audioBuffer.length > 0) {
      console.log(`${fn} ✅ 音频生成成功！`);
      console.log(`${fn} 📊 音频大小: ${audioBuffer.length} 字节`);
      console.log(`${fn} ⏱️  耗时: ${endTime - startTime} 毫秒`);

      // 保存测试音频
      const testDir = './data/wav';
      fs.mkdirSync(testDir, { recursive: true });
      const testFile = `${testDir}/simple_test.wav`;
      fs.writeFileSync(testFile, audioBuffer);
      console.log(`${fn} 💾 音频已保存到: ${testFile}`);

      return true;
    } else {
      console.error(`${fn} ❌ 音频生成失败: 返回空数据`);
      return false;
    }
  } catch (error) {
    console.error(`${fn} ❌ 服务测试失败:`, error.message);
    console.error(`${fn} 详细错误:`, error);
    return false;
  }
}

/**
 * 测试API路由
 */
async function testApiRoute() {
  const fn = 'testApiRoute->';
  console.log('\n🌐 测试API路由...');

  const testUrl = 'http://localhost:3000/api/tts?text=测试&prompt=default';

  try {
    console.log(`${fn} 📡 请求URL: ${testUrl}`);

    const response = await fetch(testUrl);

    if (!response.ok) {
      console.error(`${fn} ❌ API请求失败: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    console.log(`${fn} ✅ API响应成功:`);
    console.log(`${fn} 📋 响应码: ${result.code}`);
    console.log(`${fn} 📝 消息: ${result.msg}`);
    console.log(`${fn} 📊 数据长度: ${result.data ? result.data.length : 0} 字符`);

    return result.code === 200;
  } catch (error) {
    console.error(`${fn} ❌ API测试失败:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 简单服务测试工具');
  console.log('=' * 40);

  const tests = [
    { name: '直接TTS服务测试', func: simpleServiceTest },
    { name: 'API路由测试', func: testApiRoute },
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const result = await test.func();
      if (result) {
        console.log(`\n✅ ${test.name} 通过`);
      } else {
        allPassed = false;
        console.log(`\n❌ ${test.name} 失败`);
      }
    } catch (error) {
      allPassed = false;
      console.error(`\n❌ ${test.name} 执行出错:`, error.message);
    }
  }

  console.log('\n' + '=' * 40);
  if (allPassed) {
    console.log('🎉 所有服务测试通过！');
  } else {
    console.log('💥 部分服务测试失败！');
  }
}

// 执行测试
main().catch((error) => {
  console.error('❌ 测试过程中发生未捕获的错误:', error);
  process.exit(1);
});
