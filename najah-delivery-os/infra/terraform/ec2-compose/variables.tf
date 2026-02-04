variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "me-south-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of the SSH key pair to use for EC2 instance"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "openrouter_api_key" {
  description = "OpenRouter API key for LLM assistant"
  type        = string
  sensitive   = true
}
