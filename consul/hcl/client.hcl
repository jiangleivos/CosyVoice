datacenter = "dc1"
data_dir = "./data"
server = false # 明确声明为 Client
node_name = "client-cp5090-01" # 按业务命名
bind_addr = "192.168.1.68" # 当前节点 IP
client_addr = "0.0.0.0"

# 加密配置（所有节点必须相同）
encrypt = "9jDlnrHZsXWLodtHkaawNcN+MQdx81G/BQFZYci5xOg="

# 连接 Server 节点
retry_join = ["192.168.1.198","192.168.1.116","192.168.1.159"]


# 服务发现接口
addresses {
  http = "0.0.0.0"
  dns = "0.0.0.0"
}

ui_config{
  enabled=true
}


# 启用 UI 和健康检查
# enable_script_checks = true

# 服务定义目录
# config_entries {
#   path = "/etc/consul.d/services/"
# }