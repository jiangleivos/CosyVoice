# API 环境配置切换指南

本文档用于指导如何在不同的后端 TTS 环境之间进行切换。

## 通过配置文件切换

所有的环境配置都已集中到 `api/conf/config.json` 文件中。要切换环境，请直接修改此文件。

### 配置文件结构

```json
{
  "consul": {
    "url": "http://192.168.1.88",
    "service": "cosy-service-test"
  }
}
```

### 环境变量

- `consul.url`: Consul Agent 的访问地址。API 服务器将通过此地址与 Consul 通信。

您也可以通过设置环境变量来覆盖默认配置：
- `CONSUL_URL`: Consul Agent 地址
- `CONSUL_SERVICE`: Consul 服务名
- `TTS_DOMAIN`: TTS 服务域名

示例：
```bash
export CONSUL_URL=http://192.168.1.68
export CONSUL_SERVICE=cosy-service-test
export TTS_DOMAIN=http://192.168.1.68
```
-   `consul.service`: API 服务器要在 Consul 中查找的后端 TTS 服务的名称。

### 切换步骤

1.  打开 `api/conf/config.json` 文件。
2.  根据您的目标环境，修改 `url` 和 `service` 的值。
3.  **重启 Node.js API 服务器** 以加载新的配置。

**示例：切换到 `192.168.1.68` 的 `cosy-service-test` 环境**

将 `api/conf/config.json` 的内容修改为：

```json
{
  "consul": {
    "url": "http://192.168.1.68",
    "service": "cosy-service-test"
  }
}
```

---

**重要提示**: 每次修改完配置文件后，**必须重启 Node.js API 服务器** 才能使新的配置生效。

## 手动使TTL检查过期

在测试环境中，可能需要手动使服务的TTL健康检查过期以验证系统的容错能力。以下是操作步骤：

### 操作步骤

1.  首先获取服务的检查ID：
    ```bash
    curl -s "http://192.168.1.68:8500/v1/health/checks/cosy-service-test" | jq '.[] | select(.ServiceID=="cosy-5090-service-1")'
    ```

2.  使用Consul API将检查状态设置为critical：
    ```bash
    curl -X PUT http://192.168.1.68:8500/v1/agent/check/fail/[检查ID]
    ```
    例如：
    ```bash
    curl -X PUT http://192.168.1.68:8500/v1/agent/check/fail/cosy-cp5090-ttl-1
    ```

3.  验证检查状态是否已更新为critical：
    ```bash
    curl -s "http://192.168.1.68:8500/v1/health/checks/cosy-service-test" | jq '.[] | select(.ServiceID=="cosy-5090-service-1") | .Status'
    ```

### 注意事项

- 请确保将示例中的IP地址和检查ID替换为实际环境中的值
- 此操作仅应用于测试环境，不应在生产环境中执行
- 执行此操作后，相应的服务将被视为不健康，直到下一次成功的TTL更新
