#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { getConsulUrl } from '../lib/config.mjs';

const execAsync = promisify(exec);

/**
 * 测试网络连接
 */
async function testNetworkConnection() {
  const fn = 'testNetworkConnection->';
  console.log('🌐 开始测试网络连接...');

  // 从Consul URL获取地址
  const consulUrl = await getConsulUrl();

  // 提取IP地址
  const testHost = new URL(consulUrl).hostname;
  const consulPort = 8500;
  const ttsPort = 5001;

  console.log(`${fn} 📋 测试配置:`);
  console.log(`${fn}   目标主机: ${testHost}`);
  console.log(`${fn}   Consul URL: ${consulUrl}`);
  console.log(`${fn}   TTS服务将从Consul动态获取`);

  // 1. 测试基本连通性（ping）
  console.log(`${fn} 🏓 测试ping连通性...`);
  try {
    await execAsync(`ping -c 3 ${testHost}`);
    console.log(`${fn} ✅ ping ${testHost} 成功`);
  } catch (error) {
    console.error(`${fn} ❌ ping ${testHost} 失败:`, error.message);
    return false;
  }

  // 2. 测试Consul端口连通性
  console.log(`${fn} 🔌 测试Consul端口连通性...`);
  try {
    await execAsync(`nc -z -v ${testHost} ${consulPort}`, { timeout: 5000 });
    console.log(`${fn} ✅ Consul端口 ${consulPort} 可达`);
  } catch (error) {
    console.error(`${fn} ❌ Consul端口 ${consulPort} 不可达:`, error.message);
    return false;
  }

  // 3. 测试TTS端口连通性
  console.log(`${fn} 🔌 测试TTS端口连通性...`);
  try {
    await execAsync(`nc -z -v ${testHost} ${ttsPort}`, { timeout: 5000 });
    console.log(`${fn} ✅ TTS端口 ${ttsPort} 可达`);
  } catch (error) {
    console.error(`${fn} ❌ TTS端口 ${ttsPort} 不可达:`, error.message);
    // TTS端口可能有多个，所以继续检查其他端口
  }

  // 4. 测试HTTP连接到Consul
  console.log(`${fn} 🌐 测试HTTP连接到Consul...`);
  try {
    await execAsync(`curl -s --connect-timeout 5 ${consulUrl}:${consulPort}/v1/status/leader`);
    console.log(`${fn} ✅ HTTP连接到Consul成功`);
  } catch (error) {
    console.error(`${fn} ❌ HTTP连接到Consul失败:`, error.message);
    return false;
  }

  return true;
}

/**
 * 获取当前网络配置信息
 */
async function getNetworkInfo() {
  const fn = 'getNetworkInfo->';
  console.log('\n📊 获取网络配置信息...');

  try {
    // 获取当前IP地址
    const { stdout: ipInfo } = await execAsync("ifconfig | grep -E 'inet ' | grep -v 127.0.0.1");
    console.log(`${fn} 🏠 本地IP地址:`);
    console.log(ipInfo.trim());

    // 获取路由表信息
    const { stdout: routeInfo } = await execAsync('netstat -rn | grep default');
    console.log(`${fn} 🛤️  默认路由:`);
    console.log(routeInfo.trim());
  } catch (error) {
    console.error(`${fn} ❌ 获取网络信息失败:`, error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始网络连接诊断');
  console.log('=' * 50);

  // 获取网络信息
  await getNetworkInfo();

  // 测试网络连接
  const result = await testNetworkConnection();

  console.log('\n' + '=' * 50);
  if (result) {
    console.log('✅ 网络连接测试通过！');
  } else {
    console.log('❌ 网络连接测试失败！');
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查目标服务器是否启动');
    console.log('2. 检查防火墙设置');
    console.log('3. 检查VPN连接（如果需要）');
    console.log('4. 确认当前环境网络配置');
  }
}

// 执行测试
main().catch((error) => {
  console.error('❌ 网络测试过程中发生错误:', error);
  process.exit(1);
});
