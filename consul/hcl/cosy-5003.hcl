service {
    id      = "cosy-server-service-3"
    name    = "cosy-service"
    tags    = ["voice", "api"]  # 自定义标签（可选）
    address = "192.168.1.68"
    port    = 5003
    check {
      id       = "cosy-server-3"
      name     = "Consul CosyServer TCP on port 5003"
      http     = "http://192.168.1.68:5003/health"
      method   = "GET"
      header   = { Content-Type = ["application/json"] } # 可选头
      tcp      = "192.168.1.68:5003"
      interval = "15s"
      timeout  = "2s"
    }    
    meta {
      status="ready"
    }
  }