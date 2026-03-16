env "master" {
  src = "file://backend/prisma/master/schema.prisma"
  dev = env("MASTER_DB_URL")
  url = env("MASTER_DB_URL")
}

env "tenant" {
  src = "file://backend/prisma/tenant/schema.prisma"
  dev = env("TENANT_DEMO_DB_URL")
  url = env("TENANT_DEMO_DB_URL")
}
