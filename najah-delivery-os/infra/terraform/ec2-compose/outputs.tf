output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.najah_eip.public_ip
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.najah_delivery.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${aws_eip.najah_eip.public_ip}"
}

output "merchant_portal_url" {
  description = "URL for the Merchant Portal"
  value       = "http://${aws_eip.najah_eip.public_ip}"
}

output "api_url" {
  description = "URL for the Express API"
  value       = "http://${aws_eip.najah_eip.public_ip}:8080"
}

output "admin_url" {
  description = "URL for the Streamlit Admin"
  value       = "http://${aws_eip.najah_eip.public_ip}:8501"
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.najah_sg.id
}
