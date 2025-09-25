# API 环境配置切换指南

本文档用于指导如何在不同的后端 TTS 环境之间进行切换。

## 通过配置文件切换

所有的环境配置都已集中到 `api/conf/config.json` 文件中。要切换环境，请直接修改此文件。

### 配置文件结构

```json
{
  "consul": {
    "url": "http://192.168.1.68",
    "service": "cosy-service-test"
  },
  "tts": {
    "domain": "http://192.168.1.68"
  }
}
```

### 配置参数说明

- `consul.url`: Consul 服务器的地址，用于服务发现和健康检查。
- `consul.service`: API 服务器要在 Consul 中查找的后端 TTS 服务的名称。
- `tts.domain`: TTS 服务的基础域名地址。

### 快速切换方法

#### 方法一：使用配置切换工具（推荐）

```bash
# 切换到测试环境
node test/configTest.mjs switch test

# 切换到生产环境
node test/configTest.mjs switch prod

# 验证当前配置
node test/configTest.mjs verify

# 测试配置加载功能
node test/configTest.mjs test
```

#### 方法二：手动修改配置文件

**切换到测试环境 (192.168.1.68)**

将 `api/conf/config.json` 的内容修改为：

```json
{
  "consul": {
    "url": "http://192.168.1.68",
    "service": "cosy-service-test"
  },
  "tts": {
    "domain": "http://192.168.1.68"
  }
}
```

**切换到生产环境 (192.168.1.88)**

将 `api/conf/config.json` 的内容修改为：

```json
{
  "consul": {
    "url": "http://192.168.1.88",
    "service": "cosy-service"
  },
  "tts": {
    "domain": "http://192.168.1.88"
  }
}
```

### 环境验证

配置切换后，可以使用以下脚本验证环境是否正常：

```bash
# 完整环境验证
node test/testEnvironmentVerify.mjs

# 网络连接测试
node test/networkTest.mjs

# Consul服务诊断
node test/consulDiagnostic.mjs

# 简单TTS服务测试
node test/simpleServiceTest.mjs
```

### 重要说明

1. **无需重启服务**：配置文件会在每次请求时动态加载，无需重启 Node.js 服务。
2. **自动备份**：使用配置切换工具时会自动备份当前配置。
3. **配置验证**：切换后工具会自动验证新配置是否生效。
4. **错误处理**：如果目标环境不可用，系统会保持当前配置不变。

### 故障排除

如果切换后服务不正常，请按以下步骤排查：

1. 检查配置文件格式是否正确
2. 验证目标环境网络连通性
3. 确认 Consul 服务状态
4. 检查 TTS 服务是否健康

使用诊断工具可以快速定位问题：

```bash
node test/consulDiagnostic.mjs
```
