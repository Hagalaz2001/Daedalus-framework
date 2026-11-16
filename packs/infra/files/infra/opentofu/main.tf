# OpenTofu (MPL-2.0, https://opentofu.org). Local example: a Docker network and a Postgres container.
# Run `tofu init`, `tofu plan`, read the plan, then a human runs `tofu apply`. Never commit state or variable values.
terraform {
  required_version = ">= 1.8"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

resource "docker_network" "app" {
  name = "app"
}

resource "docker_image" "postgres" {
  name = "postgres:17.2"
}

resource "docker_container" "db" {
  name  = "app-db"
  image = docker_image.postgres.image_id
  env = [
    "POSTGRES_USER=app",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "POSTGRES_DB=app",
  ]
  networks_advanced {
    name = docker_network.app.name
  }
  ports {
    internal = 5432
    external = 5432
    ip       = "127.0.0.1"
  }
}
