service {
    id      = "cosy-cp104-service-1"
    name    = "cosy-service"
    tags    = ["voice", "api"]  # 自定义标签（可选）
    address = "192.168.1.104"
    port    = 5001
    checks =[
    {
      id       = "cosy-cp104-ttl-1"
      name     = "CosyServer-TTL-Check"
      ttl      = "30m"  # 设置 TTL 时间
      notes    = "TTL check for CosyServer"
    } ]
    meta {
      status="ready"
    }
  }