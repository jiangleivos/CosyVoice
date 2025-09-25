import fs from 'fs';
import { log } from 'console';

const CONFIG_PATH = '../conf/config.json';

/**
 * 加载配置文件
 * @returns {Object} 配置对象
 */
export async function loadConfig() {
  try {
    const configData = fs.readFileSync(new URL(CONFIG_PATH, import.meta.url), 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('加载配置文件失败:', error.message);
    return null;
  }
}

/**
 * 获取 Consul URL
 * @returns {string} Consul URL
 */
export async function getConsulUrl() {
  const config = await loadConfig();
  return config?.consul?.url || 'http://192.168.1.88';
}

/**
 * 获取 Consul 服务名称
 * @returns {string} Consul 服务名称
 */
export async function getConsulService() {
  const config = await loadConfig();
  return config?.consul?.service || 'cosy-service-test';
}
