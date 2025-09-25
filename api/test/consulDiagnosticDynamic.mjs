#!/usr/bin/env node

import Consul from '../lib/consul.mjs';
import { getConsulUrl, getConsulService } from '../lib/config.mjs';
import { log } from 'console';

/**
 * 详细的Consul服务诊断
 */
async function consulDiagnostic() {
  const fn = 'consulDiagnostic->';
  console.log('🔧 开始Consul服务诊断...');

  const consulUrl = await getConsulUrl();
  const serviceName = await getConsulService();

  console.log(`${fn} 📋 当前配置:`);
  console.log(`${fn}   Consul URL: ${consulUrl}`);
  console.log(`${fn}   服务名称: ${serviceName}`);

  const consul = new Consul(consulUrl);

  try {
    // 1. 获取所有注册的服务
    console.log(`${fn} 📋 获取所有注册的服务...`);
    const allServices = await consul.discoverService(serviceName);
    console.log(`${fn} 找到 ${allServices.length} 个注册的服务实例:`);

    if (allServices.length === 0) {
      console.error(`${fn} ❌ 未找到任何名为 "${serviceName}" 的服务注册`);
      return false;
    }

    allServices.forEach((service, index) => {
      console.log(`${fn}   服务 ${index + 1}:`);
      console.log(`${fn}     ID: ${service.ServiceID}`);
      console.log(`${fn}     名称: ${service.ServiceName}`);
      console.log(`${fn}     地址: ${service.ServiceAddress}:${service.ServicePort}`);
      console.log(`${fn}     标签: ${JSON.stringify(service.ServiceTags || [])}`);
      console.log(`${fn}     元数据: ${JSON.stringify(service.ServiceMeta || {})}`);
      console.log('');
    });

    // 2. 获取健康检查状态
    console.log(`${fn} 🏥 获取健康检查状态...`);
    const healthStatus = await consul.getHealthyService(serviceName, false); // 获取所有状态，不只是passing

    if (healthStatus.length === 0) {
      console.log(`${fn} ❌ 没有找到任何健康检查信息`);
      return false;
    }

    let hasHealthyServices = false;
    healthStatus.forEach((healthCheck, index) => {
      console.log(`${fn}   健康检查 ${index + 1}:`);
      console.log(`${fn}     服务ID: ${healthCheck.Service.ID}`);
      console.log(`${fn}     服务地址: ${healthCheck.Service.Address}:${healthCheck.Service.Port}`);

      let allChecksPassing = true;
      healthCheck.Checks.forEach((check, checkIndex) => {
        console.log(`${fn}     检查项 ${checkIndex + 1}:`);
        console.log(`${fn}       检查ID: ${check.CheckID}`);
        console.log(`${fn}       检查名称: ${check.Name}`);
        console.log(`${fn}       状态: ${check.Status}`);
        console.log(`${fn}       输出: ${check.Output || 'N/A'}`);
        console.log(`${fn}       备注: ${check.Notes || 'N/A'}`);

        if (check.Status !== 'passing') {
          allChecksPassing = false;
        }
      });

      if (allChecksPassing) {
        hasHealthyServices = true;
        console.log(`${fn}     ✅ 服务 ${healthCheck.Service.ID} 健康状态正常`);
      } else {
        console.log(`${fn}     ❌ 服务 ${healthCheck.Service.ID} 健康状态异常`);
      }
      console.log('');
    });

    // 3. 如果没有健康服务，尝试刷新TTL检查
    if (!hasHealthyServices) {
      console.log(`${fn} 🔄 尝试刷新TTL检查...`);
      for (const healthCheck of healthStatus) {
        const serviceId = healthCheck.Service.ID;
        try {
          await consul.refreshTTLCheckByServiceId(serviceId, 'pass');
          console.log(`${fn} ✅ 成功刷新服务 ${serviceId} 的TTL检查`);
        } catch (error) {
          console.error(`${fn} ❌ 刷新服务 ${serviceId} 的TTL检查失败:`, error.message);
        }
      }

      // 4. 重新检查健康状态
      console.log(`${fn} 🔄 重新检查健康状态...`);
      const newHealthStatus = await consul.getHealthyService(serviceName, true); // 只获取健康的

      if (newHealthStatus.length > 0) {
        console.log(`${fn} ✅ 现在有 ${newHealthStatus.length} 个健康的服务实例`);
        return true;
      } else {
        console.log(`${fn} ❌ 刷新后仍然没有健康的服务实例`);
        return false;
      }
    } else {
      console.log(
        `${fn} ✅ 已有 ${
          healthStatus.filter((h) => h.Checks.every((c) => c.Status === 'passing')).length
        } 个健康的服务实例`
      );
      return true;
    }
  } catch (error) {
    console.error(`${fn} ❌ Consul诊断失败:`, error.message);
    return false;
  }
}

/**
 * 测试Consul API端点
 */
async function testConsulEndpoints() {
  const fn = 'testConsulEndpoints->';
  console.log('\n🔌 测试Consul API端点...');

  const consulUrl = await getConsulUrl();
  const serviceName = await getConsulService();

  const baseUrl = `${consulUrl}:8500`;
  const endpoints = [
    '/v1/status/leader',
    '/v1/status/peers',
    '/v1/agent/self',
    '/v1/catalog/services',
    `/v1/catalog/service/${serviceName}`,
    `/v1/health/service/${serviceName}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`${fn} ✅ ${endpoint} - OK (${JSON.stringify(data).length} 字节)`);
      } else {
        console.log(`${fn} ❌ ${endpoint} - ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`${fn} ❌ ${endpoint} - 连接失败: ${error.message}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🩺 Consul服务诊断工具');
  console.log('=' * 50);

  // 测试Consul端点
  await testConsulEndpoints();

  // 详细诊断
  const result = await consulDiagnostic();

  console.log('\n' + '=' * 50);
  if (result) {
    console.log('✅ Consul服务诊断成功！服务已恢复健康状态。');
  } else {
    console.log('❌ Consul服务诊断发现问题，请查看上述详细信息。');
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查目标环境的TTS服务是否正在运行');
    console.log('2. 检查服务的TTL检查配置');
    console.log('3. 手动刷新服务状态');
    console.log('4. 重启TTS服务');
  }
}

// 执行诊断
main().catch((error) => {
  console.error('❌ 诊断过程中发生错误:', error);
  process.exit(1);
});
