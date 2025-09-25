#!/usr/bin/env node

import Consul from '../lib/consul.mjs';
import { getConsulService } from '../lib/config.mjs';

/**
 * 测试健康检查逻辑
 */
async function testHealthCheck() {
  const fn = 'testHealthCheck->';
  console.log('🔍 测试健康检查逻辑...');

  try {
    const consul = new Consul();
    const serviceName = await getConsulService();

    console.log(`${fn} 服务名称: ${serviceName}`);

    // 测试服务可用性检查
    console.log(`${fn} 测试 isServiceAvailable...`);
    const isAvailable = await consul.isServiceAvailable(serviceName);
    console.log(`${fn} 服务可用性: ${isAvailable}`);

    // 测试获取健康服务
    console.log(`${fn} 测试 getHealthyService...`);
    const healthyServices = await consul.getHealthyService(serviceName);
    console.log(`${fn} 健康服务数量: ${healthyServices.length}`);

    if (healthyServices.length > 0) {
      healthyServices.forEach((service, index) => {
        console.log(`${fn} 服务 ${index + 1}:`);
        console.log(`${fn}   ID: ${service.Service.ID}`);
        console.log(`${fn}   地址: ${service.Service.Address}:${service.Service.Port}`);
        console.log(`${fn}   状态: ${service.Checks?.map((c) => c.Status).join(', ')}`);
      });
    }

    console.log(`${fn} ✅ 健康检查测试完成`);
    return true;
  } catch (error) {
    console.error(`${fn} ❌ 健康检查测试失败:`, error.message);
    return false;
  }
}

testHealthCheck()
  .then((result) => {
    console.log(result ? '✅ 测试通过' : '❌ 测试失败');
    process.exit(result ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  });
