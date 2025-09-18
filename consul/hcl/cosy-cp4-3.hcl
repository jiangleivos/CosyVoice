service {
    id      = "cosy-cp4-service-3"
    name    = "cosy-service"
    tags    = ["voice", "api"]  # 自定义标签（可选）
    address = "192.168.1.88"
    port    = 5003
    checks =[
    {
      id       = "cosy-cp4-ttl-3"
      name     = "CosyServer-TTL-Check"
      ttl      = "30m"  # 设置 TTL 时间
      notes    = "TTL check for CosyServer"
    } ]
    meta {
      status="ready"
    }
  }