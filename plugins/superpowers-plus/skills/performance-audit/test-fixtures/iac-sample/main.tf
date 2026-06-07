# Terraform root for a power-utility data-platform AWS account.
# Eval fixture for the performance-audit skill (illustrative; NOT applied — lives under test-fixtures/).
# Answer key in expected-findings.md — assessor-only; do not read it when auditing this fixture.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "util-tfstate"
    key    = "data-platform/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "subnet_ids" {
  type = list(string)
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "util-tfstate"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]
  filter {
    name   = "name"
    values = ["util-app-*"]
  }
}

resource "aws_security_group" "app" {
  name = "app-sg"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "worker" {
  count         = length(var.subnet_ids)
  ami           = data.aws_ami.app.id
  instance_type = "m5.large"
  subnet_id     = var.subnet_ids[count.index]

  vpc_security_group_ids = [aws_security_group.app.id]

  depends_on = [aws_security_group.app]
}

module "monitoring" {
  source     = "./modules/monitoring"
  depends_on = [module.security]
}

module "security" {
  source = "./modules/security"
}

resource "aws_iam_role_policy_attachment" "app" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.app.arn
  depends_on = [aws_iam_instance_profile.app]
}

resource "null_resource" "publish" {
  triggers = {
    always_run = timestamp()
  }
  provisioner "local-exec" {
    command = "./publish-artifacts.sh"
  }
}

# --- Minimal stubs referenced above ---
resource "aws_iam_role" "app" { name = "app-role" }
resource "aws_iam_policy" "app" {
  name   = "app-policy"
  policy = "{}"
}
resource "aws_iam_instance_profile" "app" {
  name = "app-profile"
  role = aws_iam_role.app.name
}
