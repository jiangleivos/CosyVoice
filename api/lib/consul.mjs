import { log } from 'console';
import { isStringObject } from 'util/types';
import { getConsulUrl } from './config.mjs';
export default class Consul {
  static status = {
    pass: 'pass',
    warn: 'warn',
    fail: 'fail',
  };
  constructor(url = null) {
    this.url = url;
    this.port = 8500;
    // 如果没有传入URL，将在初始化时动态加载
    if (!this.url) {
      this._initUrl();
    }
  }

  async _initUrl() {
    if (!this.url) {
      this.url = await getConsulUrl();
    }
  }

  /**
   * @param {Object} filter
   * @returns {Promise<Array>}
   */
  async getChecks(filter = {}) {
    const fn = 'getChecks->';
    await this._initUrl(); // 确保 URL 已初始化
    // http://192.168.1.88:8500/v1/agent/checks?filter=ServiceID%3D%3D%22cosy-cp4-service-1%22
    try {
      const url = `${this.url}:${this.port}/v1/agent/checks?`;
      // log(fn, 'url', url);
      const params = new URLSearchParams();
      let filterArr = [];
      for (let k in filter) {
        filterArr.push(`${k}=="${filter[k]}"`);
      }
      params.append('filter', filterArr.join(' and '));
      const requestUrl = `${url}${params.toString()}`;
      log(fn, 'requestUrl', [requestUrl]);
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      // log(fn, 'data', data);
      return data;
    } catch (error) {
      console.error(fn, '错误:', error);
      throw error;
    }
  }
  // changeClientUrl(url) {
  //   const fn = 'changeClientUrl->';
  //   log(fn, 'url', url);
  //   if (typeof url !== 'string' || !url.startsWith('http')) {
  //     throw new Error('Invalid URL format. Must be a string starting with "http".');
  //   }
  //   this.url = url;
  //   log(fn, 'Client URL changed to:', this.url);
  // }
  // 发现服务
  async discoverService(serviceName) {
    const fn = 'discoverService->';
    await this._initUrl(); // 确保 URL 已初始化
    const url = `${this.url}:${this.port}/v1/catalog/service/${serviceName}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(fn, '错误:', error);
      throw error;
    }
  }
  async getHealthyService(serviceName, passing = true) {
    const fn = 'getHealthyService->';
    await this._initUrl(); // 确保 URL 已初始化
    const url = `${this.url}:${this.port}/v1/health/service/${serviceName}${passing ? '?passing' : ''}`;
    this.serviceMap = {};
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const jsons = await response.json();
      for (let json of jsons) {
        if (!this.serviceMap[json.Service.ID]) {
          this.serviceMap[json.Service.ID] = json.Service;
        }
      }
      return jsons;
    } catch (error) {
      console.error('getHealthyService 错误:', error);
      throw error;
    }
  }
  // 新增：检查服务是否可用
  async isServiceAvailable(serviceName) {
    const instances = await this.getHealthyService(serviceName);
    return instances.length > 0;
  }

  async optCheck(serviceId, status) {
    const fn = 'optCheck->';
    if (['warn', 'pass'].indexOf(status) === -1) {
      throw new Error('Invalid status. Must be "warn" or "pass".');
    }
    this.url = this.serviceMap[serviceId] ? `http://${this.serviceMap[serviceId]?.Address}` : this.url;
    log(fn, 'url', this.url, 'serviceId', serviceId);
    let checks = await this.getChecks({ ServiceID: serviceId, Name: 'CosyServer-TTL-Check' });
    log(fn, 'checks', checks);
    if (Object.keys(checks).length == 0) {
      throw new Error(`No checks found for service ID: ${serviceId}`);
      // await this.deregisterCheck(checks[0].CheckID);
    }
    try {
      for (let ckid in checks) {
        let check = checks[ckid];
        const url = `${this.url}:${this.port}/v1/agent/check/${status}/${check.CheckID}`;
        const response = await fetch(url, { method: 'PUT' });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return true;
      }
    } catch (error) {
      console.error(fn, '错误:', error);
      throw error;
    }
  }
  async lockService(serviceId) {
    const fn = 'lockService->';
    await this.optCheck(serviceId, 'warn');
  }

  async unlockService(serviceId) {
    const fn = 'unlockService->';
    await this.optCheck(serviceId, 'pass');
  }

  /**
   * 根据服务ID获取服务详情
   */
  async getServiceById(serviceId) {
    const fn = 'getServiceById->';
    log(fn, 'this.serviceId', this.serviceMap[serviceId]);
    this.url = this.serviceMap[serviceId] ? `http://${this.serviceMap[serviceId]?.Address}` : this.url;
    const url = `${this.url}:${this.port}/v1/agent/health/service/id/${serviceId}`;
    try {
      log('getServiceById', 'url', url);
      const response = await fetch(url);
      if (!response.ok) {
        log(fn, '错误:', await response.text());
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const jsons = await response.json();
      log(fn, 'jsons', jsons);
      return jsons;
    } catch (error) {
      console.error('getServiceById 错误:', error);
      return null;
    }
  }
  // 新增：读取 KV 存储的值
  async getKeyValue(key, options = {}) {
    const url = `${this.url}:${this.port}/v1/kv/${key}`;
    const params = new URLSearchParams();

    // 处理可选参数
    if (options.raw) params.append('raw', 'true');
    if (options.recurse) params.append('recurse', 'true');
    if (options.dc) params.append('dc', options.dc);

    const requestUrl = `${url}?${params.toString()}`;

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // 根据 raw 模式返回不同格式
      if (options.raw) {
        return await response.text(); // 直接返回原始值
      } else {
        const data = await response.json();
        // 解码 Base64 值
        return data.map((entry) => ({
          ...entry,
          Value: entry.Value ? atob(entry.Value) : null,
        }));
      }
    } catch (error) {
      console.error('getKeyValue 错误:', error);
      throw error;
    }
  }

  /**
   * 设置 KV 存储的值
   * @param {string} key - 键名
   * @param {string} value - 要设置的值
   * @param {Object} [options] - 可选参数
   * @param {string} [options.dc] - 指定数据中心
   * @param {number} [options.flags] - 自定义标志（整数）
   * @param {string} [options.cas] - 检查并设置版本号
   * @param {boolean} [options.acquire] - 使用会话锁获取
   * @param {boolean} [options.release] - 使用会话锁释放
   * @returns {Promise<boolean>} - 操作是否成功
   */
  async setKeyValue(key, value, options = {}) {
    const url = `${this.url}:${this.port}/v1/kv/${key}`;
    const params = new URLSearchParams();

    // 处理可选参数
    if (options.dc) params.append('dc', options.dc);
    if (options.flags !== undefined) params.append('flags', options.flags.toString());
    if (options.cas) params.append('cas', options.cas);
    if (options.acquire) params.append('acquire', options.acquire);
    if (options.release) params.append('release', options.release);

    const requestUrl = `${url}?${params.toString()}`;

    try {
      // 将值转换为Base64（Consul要求）
      const base64Value = Buffer.from(value, 'utf-8').toString('base64');

      const response = await fetch(requestUrl, {
        method: 'PUT',
        body: base64Value,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Consul返回true表示成功
      return response.json();
    } catch (error) {
      console.error('setKeyValue 错误:', error);
      throw error;
    }
  }
  /**
   * 自定义状态到Consul健康状态的映射
   */
  getConsulStatusFromCustom(status) {
    const mapping = {
      ready: 'passing',
      executing: 'warning',
      completed: 'critical',
    };
    return mapping[status] || 'passing';
  }

  /**
   * 更新服务的元数据
   * @param {string} serviceId - 服务ID
   * @param {Object} metaUpdates - 要更新的元数据键值对
   * @returns {Promise<Object>} - 更新后的服务详情
   */
  async updateServiceMeta(serviceId, metaUpdates) {
    const fn = 'updateServiceMeta->';
    log(fn, 'serviceId', serviceId, 'metaUpdates', metaUpdates);
    // 1. 获取当前服务详情
    const currentService = await this.getServiceById(serviceId);
    if (!currentService) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // 2. 构建更新后的元数据
    const updatedMeta = {
      ...(currentService.Service.Meta || {}),
      ...metaUpdates,
    };

    log(fn, '-->'.repeat(20), currentService);
    // 3. 准备更新负载
    const payload = {
      ID: serviceId,
      Name: currentService.Service.Service,
      Address: currentService.Service.Address,
      Port: currentService.Service.Port,
      Meta: updatedMeta,
      Tags: currentService.Service.Tags || [],
      Checks: currentService.Checks,
    };
    this.url = this.serviceMap[serviceId] ? `http://${this.serviceMap[serviceId]?.Address}` : this.url;
    // 4. 发送更新请求
    const url = `${this.url}:${this.port}/v1/agent/service/register`;
    try {
      log(fn, 'url', url, 'payload', JSON.stringify(payload, null, 2));
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
      }

      // 5. 返回更新后的服务详情
      return this.getServiceById(serviceId);
    } catch (error) {
      console.error('updateServiceMeta 错误:', error);
      throw error;
    }
  }

  /**
   * 刷新servicename的TTL检查
   */
  async refreshTTLCheckByServiceName(serviceName, status = 'pass') {
    const fn = 'refreshTTLCheckByServiceName->';
    try {
      let services = await this.getHealthyService(serviceName, false);
      for (let service of services) {
        log(fn, '服务ID:', service.Service.ID);
        let rst = await this.refreshTTLCheckByServiceId(service.Service.ID, status);
        log(fn, '刷新TTL检查结果:', service.Service.ID, rst);
      }
      return true;
    } catch (error) {
      console.error(fn, '获取服务失败:', error);
      throw error;
    }
  }
  /**
   * 刷新服务ID的TTL检查
   * @param {String} serviceId
   */
  async refreshTTLCheckByServiceId(serviceId, status = 'pass') {
    const fn = 'refreshTTLCheckByServiceId->';
    this.url = this.serviceMap[serviceId] ? `http://${this.serviceMap[serviceId]?.Address}` : this.url;
    log(fn, 'url', this.url, 'serviceId', serviceId);
    let checks = await this.getChecks({ ServiceID: serviceId, Name: 'CosyServer-TTL-Check' });
    log(fn, 'checks', checks);
    if (Object.keys(checks).length == 0) {
      throw new Error(`No checks found for service ID: ${serviceId}`);
    }
    try {
      for (let ckid in checks) {
        let check = checks[ckid];
        const url = `${this.url}:${this.port}/v1/agent/check/${status}/${check.CheckID}`;
        const response = await fetch(url, { method: 'PUT' });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return true;
      }
    } catch (error) {
      console.error(fn, '错误:', error);
      throw error;
    }
  }
}
const main = async () => {
  const fn = 'main->';
  const cmd = process.argv[2];
  const consul = new Consul();
  switch (cmd) {
    case 'init':
      {
        // 初始化Consul客户端
        log(fn, '初始化Consul客户端');
        try {
          let serviceName = 'cosy-service';
          await consul.refreshTTLCheckByServiceName(serviceName, Consul.status.pass);
        } catch (error) {
          console.error(fn, '获取检查项失败:', error);
        }
      }
      break;
    case 'update-meta':
      {
        const serviceId = 'cosy-server-service-1';
        try {
          // 更新元数据
          const updatedService = await consul.updateServiceMeta(serviceId, {
            version: '2.0.0',
            environment: 'production',
            last_updated: new Date().toISOString(),
          });

          console.log('元数据更新成功:');
          console.log(updatedService.Meta);
        } catch (error) {
          console.error('元数据更新失败:', error);
        }
      }
      break;
    case 'kv':
      {
        // 基本设置
        await consul.setKeyValue('config/api_key', 'abc123def456');
        console.log('API Key 设置成功');

        // 带参数设置
        await consul.setKeyValue('app/version', '1.0.0', {
          dc: 'dc1',
          flags: 1,
        });

        // 原子操作（检查并设置）
        const currentValue = await consul.getKeyValue('config/api_key');
        log(fn, 'currentValue', currentValue);
        // console.log('当前API Key:', Buffer.from(currentValue, 'base64').toString('utf-8'));
        // log(fn, 'currentValue', currentValue);
        // await consul.setKeyValue('counter', '42', {
        //   cas: currentValue.ModifyIndex, // 使用当前版本号
        // });
      }
      break;
    case 'discover':
      {
        const serviceName = 'cosy-service';
        // 方式1：直接检查可用性
        // const isAvailable = await consul.isServiceAvailable(serviceName);
        // console.log(`服务 ${serviceName} 可用:`, isAvailable);

        // 方式2：获取健康实例详情
        const healthyInstances = await consul.getHealthyService(serviceName);
        if (healthyInstances.length > 0) {
          console.log('可用实例:');
          healthyInstances.forEach((instance) => {
            console.log(
              `- ${instance.Service.Address}:${instance.Service.Port}`,
              `(状态: ${instance.Checks[0].Status})`
            );
            log(fn, 'instance', instance);
          });
        } else {
          console.error('服务不可用：无健康实例');
        }
      }
      break;
  }

  // const serviceId = 'cosy-server-service-1'; // 服务ID（需与实际注册ID一致）
  // let services = await consul.getServiceById(serviceId);
  // log(fn, '服务详情:', services);
};

await main();
