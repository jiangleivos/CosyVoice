#!/usr/bin/env node

import Consul from '../lib/consul.mjs';
import fs from 'fs';
import { log } from 'console';

const CONFIG_PATH = '../conf/config.json';

async function loadConfig() {
  try {
    const configData = fs.readFileSync(new URL(CONFIG_PATH, import.meta.url), 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('加载配置文件失败:', error.message);
    return null;
  }
}

async function verifyTestEnv() {
  const fn = 'verifyTestEnv->';
  console.log('开始验证测试环境...');
  
  // 加载配置
  const config = await loadConfig();
  if (!config) {
    console.error('无法加载配置文件，退出');
    return false;
  }
  
  const { url: consulUrl, service: serviceName } = config.consul;
  console.log(`${fn} 配置: Consul URL = ${consulUrl}, 服务名称 = ${serviceName}`);
  
  // 创建 Consul 客户端
  const consul = new Consul(consulUrl);
  
  try {
    // 1. 检查 Consul 连接
    console.log(`${fn} 检查 Consul 连接...`);
    const checks = await consul.getChecks();
    console.log(`${fn} ✓ Consul 连接成功，找到 ${Object.keys(checks).length} 个检查项`);
    
    // 2. 检查服务是否注册
    console.log(`${fn} 检查服务注册...`);
    const services = await consul.discoverService(serviceName);
    if (services.length === 0) {
      console.error(`${fn} ✗ 未找到服务: ${serviceName}`);
      return false;
    }
    console.log(`${fn} ✓ 找到 ${services.length} 个服务实例`);
    
    // 3. 检查健康服务
    console.log(`${fn} 检查健康服务...`);
    const healthyServices = await consul.getHealthyService(serviceName);
    if (healthyServices.length === 0) {
      console.error(`${fn} ✗ 没有健康的服务实例`);
      return false;
    }
    console.log(`${fn} ✓ 找到 ${healthyServices.length} 个健康服务实例`);
    
    // 4. 打印服务详情
    console.log(`${fn} 服务详情:`);
    for (const service of healthyServices) {
      const { Service: { ID, Address, Port }, Checks } = service;
      const status = Checks[0].Status;
      console.log(`${fn}   - 服务ID: ${ID}, 地址: ${Address}:${Port}, 状态: ${status}`);
    }
    
    // 5. 测试服务刷新
    console.log(`${fn} 测试服务刷新...`);
    for (const service of healthyServices) {
      const serviceId = service.Service.ID;
      try {
        await consul.unlockService(serviceId);
        console.log(`${fn} ✓ 成功刷新服务: ${serviceId}`);
      } catch (error) {
        console.error(`${fn} ✗ 刷新服务失败: ${serviceId}`, error.message);
      }
    }
    
    console.log(`${fn} ✓ 测试环境验证完成`);
    return true;
  } catch (error) {
    console.error(`${fn} ✗ 验证测试环境失败:`, error.message);
    return false;
  }
}

// 执行验证
verifyTestEnv().then(success => {
  if (success) {
    console.log('测试环境验证成功');
    process.exit(0);
  } else {
    console.error('测试环境验证失败');
    process.exit(1);
  }
}).catch(error => {
  console.error('验证过程中发生错误:', error);
  process.exit(1);
});