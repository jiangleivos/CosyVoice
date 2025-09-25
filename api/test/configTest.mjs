#!/usr/bin/env node

import fs from 'fs';
import { log } from 'console';
import { loadConfig, getConsulUrl, getConsulService } from '../lib/config.mjs';

/**
 * 测试配置切换功能
 */
async function testConfigSwitching() {
  const fn = 'testConfigSwitching->';
  console.log('🔄 测试配置文件切换功能...');

  // 1. 读取当前配置
  console.log(`${fn} 📖 读取当前配置...`);
  const currentConfig = await loadConfig();
  console.log(`${fn} 当前配置:`, JSON.stringify(currentConfig, null, 2));

  // 2. 测试配置加载函数
  console.log(`${fn} 🔍 测试配置加载函数...`);
  const consulUrl = await getConsulUrl();
  const consulService = await getConsulService();

  console.log(`${fn} Consul URL: ${consulUrl}`);
  console.log(`${fn} Consul Service: ${consulService}`);
  console.log(`${fn} TTS地址将从Consul动态获取`);

  // 3. 创建测试配置
  const testConfigs = [
    {
      name: '测试环境',
      config: {
        consul: {
          url: 'http://192.168.1.68',
          service: 'cosy-service-test',
        },
        tts: {
          domain: 'http://192.168.1.68',
        },
      },
    },
    {
      name: '生产环境',
      config: {
        consul: {
          url: 'http://192.168.1.88',
          service: 'cosy-service',
        },
        tts: {
          domain: 'http://192.168.1.88',
        },
      },
    },
  ];

  console.log(`${fn} 🧪 可用的配置切换选项:`);
  testConfigs.forEach((testConfig, index) => {
    console.log(`${fn}   ${index + 1}. ${testConfig.name}:`);
    console.log(`${fn}      Consul: ${testConfig.config.consul.url} (${testConfig.config.consul.service})`);
    console.log(`${fn}      TTS: ${testConfig.config.tts.domain}`);
  });

  return true;
}

/**
 * 切换配置文件
 */
async function switchConfig(configName) {
  const fn = 'switchConfig->';
  const configPath = new URL('../conf/config.json', import.meta.url);

  const configs = {
    test: {
      consul: {
        url: 'http://192.168.1.68',
        service: 'cosy-service-test',
      },
    },
    prod: {
      consul: {
        url: 'http://192.168.1.88',
        service: 'cosy-service',
      },
    },
  };

  if (!configs[configName]) {
    console.error(`${fn} ❌ 未知的配置名称: ${configName}`);
    console.log(`${fn} 可用配置: ${Object.keys(configs).join(', ')}`);
    return false;
  }

  try {
    // 备份当前配置
    const backupPath = new URL('../conf/config.json.backup', import.meta.url);
    const currentConfig = fs.readFileSync(configPath, 'utf8');
    fs.writeFileSync(backupPath, currentConfig);
    console.log(`${fn} 💾 当前配置已备份到: ${backupPath.pathname}`);

    // 写入新配置
    const newConfig = configs[configName];
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    console.log(`${fn} ✅ 配置已切换到: ${configName}`);
    console.log(`${fn} 新配置:`, JSON.stringify(newConfig, null, 2));

    return true;
  } catch (error) {
    console.error(`${fn} ❌ 切换配置失败:`, error.message);
    return false;
  }
}

/**
 * 验证配置生效
 */
async function verifyConfigEffective() {
  const fn = 'verifyConfigEffective->';
  console.log(`${fn} 🔍 验证配置是否生效...`);

  try {
    // 动态导入以确保重新加载模块
    const {
      loadConfig: newLoadConfig,
      getConsulUrl: newGetConsulUrl,
      getConsulService: newGetConsulService,
    } = await import('../lib/config.mjs?' + Date.now());

    const config = await newLoadConfig();
    const consulUrl = await newGetConsulUrl();
    const consulService = await newGetConsulService();

    console.log(`${fn} ✅ 配置验证结果:`);
    console.log(`${fn}   配置文件: ${JSON.stringify(config, null, 2)}`);
    console.log(`${fn}   Consul URL: ${consulUrl}`);
    console.log(`${fn}   Consul Service: ${consulService}`);
    console.log(`${fn}   TTS 地址将从Consul动态获取`);

    return true;
  } catch (error) {
    console.error(`${fn} ❌ 配置验证失败:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('⚙️  配置文件切换测试工具');
  console.log('=' * 50);

  const command = process.argv[2];
  const param = process.argv[3];

  switch (command) {
    case 'test':
      await testConfigSwitching();
      break;
    case 'switch':
      if (!param) {
        console.error('❌ 请指定配置名称: test 或 prod');
        console.log('使用方法: node configTest.mjs switch test');
        process.exit(1);
      }
      const success = await switchConfig(param);
      if (success) {
        await verifyConfigEffective();
      }
      break;
    case 'verify':
      await verifyConfigEffective();
      break;
    default:
      console.log('📖 使用指南:');
      console.log('  node test/configTest.mjs test     - 测试配置加载功能');
      console.log('  node test/configTest.mjs switch test  - 切换到测试环境');
      console.log('  node test/configTest.mjs switch prod  - 切换到生产环境');
      console.log('  node test/configTest.mjs verify  - 验证当前配置');
      break;
  }
}

// 执行测试
main().catch((error) => {
  console.error('❌ 测试过程中发生错误:', error);
  process.exit(1);
});
