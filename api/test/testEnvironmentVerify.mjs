#!/usr/bin/env node

import 'date-utils';
import TTSClient from '../lib/TTS.mjs';
import Consul from '../lib/consul.mjs';
import fs from 'fs';
import { log } from 'console';

const CONFIG_PATH = '../conf/config.json';

/**
 * 加载配置文件
 */
async function loadConfig() {
  try {
    const configData = fs.readFileSync(new URL(CONFIG_PATH, import.meta.url), 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('❌ 加载配置文件失败:', error.message);
    return null;
  }
}

/**
 * 测试Consul连接和服务发现
 */
async function testConsulConnection() {
  const fn = 'testConsulConnection->';
  console.log('\n📡 开始测试Consul连接...');

  const config = await loadConfig();
  if (!config) {
    return false;
  }

  const { url: consulUrl, service: serviceName } = config.consul;
  console.log(`${fn} 测试环境配置:`);
  console.log(`   - Consul URL: ${consulUrl}`);
  console.log(`   - 服务名称: ${serviceName}`);

  // 创建 Consul 客户端
  const consul = new Consul(consulUrl);

  try {
    // 1. 检查 Consul 连接
    console.log(`${fn} 🔍 检查 Consul 连接...`);
    const checks = await consul.getChecks();
    console.log(`${fn} ✅ Consul 连接成功，找到 ${Object.keys(checks).length} 个检查项`);

    // 2. 检查服务是否注册
    console.log(`${fn} 🔍 检查服务注册...`);
    const services = await consul.discoverService(serviceName);
    if (services.length === 0) {
      console.error(`${fn} ❌ 未找到服务: ${serviceName}`);
      return false;
    }
    console.log(`${fn} ✅ 找到 ${services.length} 个服务实例`);

    // 3. 检查健康服务
    console.log(`${fn} 🔍 检查健康服务...`);
    const healthyServices = await consul.getHealthyService(serviceName);
    if (healthyServices.length === 0) {
      console.error(`${fn} ❌ 没有健康的服务实例`);
      return false;
    }
    console.log(`${fn} ✅ 找到 ${healthyServices.length} 个健康服务实例`);

    // 4. 打印服务详情
    console.log(`${fn} 📋 服务详情:`);
    for (const service of healthyServices) {
      const {
        Service: { ID, Address, Port, Meta },
        Checks,
      } = service;
      const status = Checks[0].Status;
      console.log(`${fn}   📍 服务ID: ${ID}`);
      console.log(`${fn}   🌐 地址: ${Address}:${Port}`);
      console.log(`${fn}   📊 状态: ${status}`);
      console.log(`${fn}   🏷️  元数据: ${JSON.stringify(Meta || {}, null, 6)}`);
      console.log('');
    }

    return true;
  } catch (error) {
    console.error(`${fn} ❌ Consul连接测试失败:`, error.message);
    return false;
  }
}

/**
 * 测试TTS服务连接
 */
async function testTTSService() {
  const fn = 'testTTSService->';
  console.log('\n🎤 开始测试TTS服务...');

  try {
    const ttsClient = new TTSClient();
    const testText = '测试环境验证';
    const testPrompt = 'default';

    console.log(`${fn} 🔍 获取可用TTS服务...`);
    const services = await ttsClient.getAvailableServices();

    if (!services || services.length === 0) {
      console.error(`${fn} ❌ 没有可用的TTS服务`);
      return false;
    }

    console.log(`${fn} ✅ 找到 ${services.length} 个可用TTS服务`);

    // 显示服务详情
    services.forEach((service, index) => {
      const {
        Service: { ID, Address, Port, Meta },
      } = service;
      console.log(`${fn}   📍 服务 ${index + 1}: ${ID} - ${Address}:${Port}`);
      console.log(`${fn}   📊 状态: ${Meta?.status || 'unknown'}`);
    });

    // 测试生成音频
    console.log(`${fn} 🎵 测试音频生成...`);
    console.log(`${fn} 测试文本: "${testText}"`);
    console.log(`${fn} 测试音色: "${testPrompt}"`);

    const audioBuffer = await ttsClient.generateAudio(testText, testPrompt);

    if (!audioBuffer) {
      console.error(`${fn} ❌ 音频生成失败`);
      return false;
    }

    console.log(`${fn} ✅ 音频生成成功，大小: ${audioBuffer.length} 字节`);

    // 保存测试音频文件
    const testAudioPath = './data/wav/test_env_verify.wav';
    fs.mkdirSync('./data/wav', { recursive: true });
    fs.writeFileSync(testAudioPath, audioBuffer);
    console.log(`${fn} 💾 测试音频已保存到: ${testAudioPath}`);

    return true;
  } catch (error) {
    console.error(`${fn} ❌ TTS服务测试失败:`, error.message);
    return false;
  }
}

/**
 * 测试环境配置验证
 */
async function verifyEnvironmentConfig() {
  const fn = 'verifyEnvironmentConfig->';
  console.log('\n⚙️  开始验证环境配置...');

  // 检查配置文件
  const config = await loadConfig();
  if (!config) {
    return false;
  }

  console.log(`${fn} 📄 配置文件内容:`);
  console.log(JSON.stringify(config, null, 2));

  // 验证测试环境URL
  const expectedTestUrl = 'http://192.168.1.68';
  const expectedTestService = 'cosy-service-test';

  if (config.consul.url !== expectedTestUrl) {
    console.error(`${fn} ❌ Consul URL配置错误:`);
    console.error(`${fn}    期望: ${expectedTestUrl}`);
    console.error(`${fn}    实际: ${config.consul.url}`);
    return false;
  }

  if (config.consul.service !== expectedTestService) {
    console.error(`${fn} ❌ 服务名称配置错误:`);
    console.error(`${fn}    期望: ${expectedTestService}`);
    console.error(`${fn}    实际: ${config.consul.service}`);
    return false;
  }

  console.log(`${fn} ✅ 配置验证通过`);
  return true;
}

/**
 * 检查代码中的硬编码值
 */
async function checkHardcodedValues() {
  const fn = 'checkHardcodedValues->';
  console.log('\n🔍 检查代码中的硬编码值...');

  try {
    // 读取TTS.mjs文件内容
    const ttsContent = fs.readFileSync(new URL('../lib/TTS.mjs', import.meta.url), 'utf8');

    // 检查DOMAIN设置
    const domainMatch = ttsContent.match(/const DOMAIN = '([^']+)'/);
    if (domainMatch) {
      const domain = domainMatch[1];
      console.log(`${fn} 🌐 TTS.mjs中的DOMAIN: ${domain}`);
      if (domain !== 'http://192.168.1.68') {
        console.error(`${fn} ⚠️  DOMAIN可能不是测试环境地址`);
      } else {
        console.log(`${fn} ✅ DOMAIN配置正确`);
      }
    }

    // 检查CONSUL_SERVICE设置
    const serviceMatch = ttsContent.match(/const CONSUL_SERVICE = '([^']+)'/);
    if (serviceMatch) {
      const service = serviceMatch[1];
      console.log(`${fn} 🏷️  TTS.mjs中的CONSUL_SERVICE: ${service}`);
      if (service !== 'cosy-service-test') {
        console.error(`${fn} ⚠️  CONSUL_SERVICE可能不是测试环境服务名`);
      } else {
        console.log(`${fn} ✅ CONSUL_SERVICE配置正确`);
      }
    }

    // 读取api.mjs文件内容
    const apiContent = fs.readFileSync(new URL('../routes/api.mjs', import.meta.url), 'utf8');

    // 检查api.mjs中的CONSUL_SERVICE
    const apiServiceMatch = apiContent.match(/const CONSUL_SERVICE = '([^']+)'/);
    if (apiServiceMatch) {
      const apiService = apiServiceMatch[1];
      console.log(`${fn} 🏷️  api.mjs中的CONSUL_SERVICE: ${apiService}`);
      if (apiService !== 'cosy-service-test') {
        console.error(`${fn} ⚠️  api.mjs中的CONSUL_SERVICE可能不是测试环境服务名`);
      } else {
        console.log(`${fn} ✅ api.mjs中的CONSUL_SERVICE配置正确`);
      }
    }

    // 读取consul.mjs文件内容
    const consulContent = fs.readFileSync(new URL('../lib/consul.mjs', import.meta.url), 'utf8');

    // 检查consul.mjs中的默认URL
    const consulUrlMatch = consulContent.match(/constructor\(url = '([^']+)'\)/);
    if (consulUrlMatch) {
      const consulUrl = consulUrlMatch[1];
      console.log(`${fn} 🌐 consul.mjs中的默认URL: ${consulUrl}`);
      if (consulUrl !== 'http://192.168.1.68') {
        console.error(`${fn} ⚠️  consul.mjs默认URL不是测试环境地址，这可能导致问题！`);
        console.error(`${fn}    当前值: ${consulUrl}`);
        console.error(`${fn}    应该改为: http://192.168.1.68`);
        return false;
      } else {
        console.log(`${fn} ✅ consul.mjs默认URL配置正确`);
      }
    }

    return true;
  } catch (error) {
    console.error(`${fn} ❌ 检查硬编码值失败:`, error.message);
    return false;
  }
}

/**
 * 主验证函数
 */
async function main() {
  console.log('🚀 开始测试环境验证');
  console.log('=' * 50);

  const tests = [
    { name: '环境配置验证', func: verifyEnvironmentConfig },
    { name: '硬编码值检查', func: checkHardcodedValues },
    { name: 'Consul连接测试', func: testConsulConnection },
    { name: 'TTS服务测试', func: testTTSService },
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const result = await test.func();
      if (!result) {
        allPassed = false;
        console.log(`\n❌ ${test.name} 失败`);
      } else {
        console.log(`\n✅ ${test.name} 通过`);
      }
    } catch (error) {
      allPassed = false;
      console.error(`\n❌ ${test.name} 执行出错:`, error.message);
    }
  }

  console.log('\n' + '=' * 50);
  if (allPassed) {
    console.log('🎉 所有测试通过！测试环境配置正确。');
    process.exit(0);
  } else {
    console.log('💥 部分测试失败！请检查上述错误信息。');
    process.exit(1);
  }
}

// 执行测试
main().catch((error) => {
  console.error('❌ 验证过程中发生未捕获的错误:', error);
  process.exit(1);
});
