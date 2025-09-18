#./consul agent -client=0.0.0.0 -bind=192.168.1.152 -data-dir=./data -node=client-mac
#consul agent -config-file=./conf/client.hcl -config-dir=./hcl/
consul agent -config-file=./hcl/client.hcl -config-dir=./hcl/