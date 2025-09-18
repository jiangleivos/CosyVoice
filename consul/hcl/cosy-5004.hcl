service {
    id      = "cosy-server-service-4"
    name    = "cosy-service"
    tags    = ["voice", "api"]  # 自定义标签（可选）
    address = "192.168.1.68"
    port    = 5004
    check {
      id       = "cosy-server-4"
      name     = "Consul CosyServer TCP on port 5004"
      http     = "http://192.168.1.68:5004/health"
      method   = "GET"
      header   = { Content-Type = ["application/json"] } # 可选头
      tcp      = "192.168.1.68:5004"
      interval = "15s"
      timeout  = "2s"
    }
    meta {
      status="ready"
    }
  }