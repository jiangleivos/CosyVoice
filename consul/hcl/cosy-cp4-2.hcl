service {
    id      = "cosy-cp4-service-2"
    name    = "cosy-service"
    tags    = ["voice", "api"]  # 自定义标签（可选）
    address = "192.168.1.88"
    port    = 5002
    checks =[
    {
      id       = "cosy-cp4-ttl-2"
      name     = "CosyServer-TTL-Check"
      ttl      = "30m"  # 设置 TTL 时间
      notes    = "TTL check for CosyServer"
    } ]
    meta {
      status="ready"
    }
  }