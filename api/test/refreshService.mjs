#!/usr/bin/env node

import Consul from '../lib/consul.mjs';
import { log } from 'console';

/**
 * 刷新Consul服务健康检查状态
 * 
 * 使用方法:
 * node refreshService.mjs [ip] [serviceName]
 * node refreshService.mjs --service-id [serviceId] [ip]
 * 
 * 示例:
 * node refreshService.mjs 192.168.1.88 cosy-service
 * node refreshService.mjs 192.168.1.68 cosy-service-test
 * node refreshService.mjs --service-id cosy-5090-service-1 192.168.1.68
 */

async function refreshService(ip, serviceName, serviceId = null) {
  try {
    console.log(`开始刷新服务: ${serviceName || serviceId} @ ${ip}`);
    
    // 创建Consul客户端实例
    const consulUrl = `http://${ip}`;
    const consul = new Consul(consulUrl);
    
    if (serviceId) {
      // 如果提供了服务ID，直接刷新该服务实例
      console.log(`正在刷新指定服务实例: ${serviceId}`);
      
      try {
        // 尝试解锁服务（将健康检查状态设置为passing）
        await consul.unlockService(serviceId);
        console.log(`✓ 成功刷新服务实例: ${serviceId}`);
      } catch (error) {
        console.error(`✗ 刷新服务实例失败: ${serviceId}`, error.message);
      }
    } else {
      // 否则按服务名称查找并刷新所有健康实例
      console.log(`按服务名称查找实例: ${serviceName}`);
      
      // 获取健康服务实例
      const services = await consul.getHealthyService(serviceName, true);
      console.log(`找到 ${services.length} 个健康服务实例`);
      
      if (services.length === 0) {
        console.log('没有找到健康的服务实例');
        return;
      }
      
      // 遍历所有服务实例并刷新其健康检查
      for (const service of services) {
        const serviceId = service.Service.ID;
        const serviceAddress = service.Service.Address;
        const servicePort = service.Service.Port;
        
        console.log(`正在刷新服务实例: ${serviceId} (${serviceAddress}:${servicePort})`);
        
        try {
          // 尝试解锁服务（将健康检查状态设置为passing）
          await consul.unlockService(serviceId);
          console.log(`✓ 成功刷新服务实例: ${serviceId}`);
        } catch (error) {
          console.error(`✗ 刷新服务实例失败: ${serviceId}`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('刷新服务时发生错误:', error.message);
    process.exit(1);
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
let ip = '192.168.1.88';
let serviceName = 'cosy-service';
let serviceId = null;

// 解析命令行参数
if (args.length >= 1) {
  if (args[0] === '--service-id' && args.length >= 3) {
    serviceId = args[1];
    ip = args[2];
    serviceName = null; // 不使用服务名称
  } else {
    ip = args[0];
    if (args.length >= 2) {
      serviceName = args[1];
    }
  }
}

console.log(`使用参数: IP=${ip}, ServiceName=${serviceName}, ServiceId=${serviceId}`);

// 执行刷新操作
refreshService(ip, serviceName, serviceId).then(() => {
  console.log('服务刷新完成');
}).catch((error) => {
  console.error('服务刷新失败:', error);
});