# Najah Delivery OS - Terraform EC2 Deployment

This Terraform configuration deploys the Najah Delivery OS on AWS EC2 using Docker Compose.

## Architecture

- **VPC**: Isolated network with public subnet
- **EC2 Instance**: t3.medium (2 vCPU, 4GB RAM) running Ubuntu 22.04
- **Docker Compose**: All services containerized
- **Nginx**: Reverse proxy for routing traffic
- **Elastic IP**: Static public IP address

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Terraform** >= 1.0 installed
4. **SSH Key Pair** created in AWS EC2

### Creating an SSH Key Pair

```bash
# Create key pair in AWS (if not exists)
aws ec2 create-key-pair \
  --key-name najah-delivery-key \
  --region me-south-1 \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/najah-delivery-key.pem

# Set correct permissions
chmod 400 ~/.ssh/najah-delivery-key.pem
```

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd najah-delivery-os/infra/terraform/ec2-compose
```

### 2. Configure Variables

Create a `terraform.tfvars` file:

```hcl
aws_region         = "me-south-1"
instance_type      = "t3.medium"
key_name           = "najah-delivery-key"
vpc_cidr           = "10.0.0.0/16"
openrouter_api_key = "your-openrouter-api-key-here"
```

**Important**: Never commit `terraform.tfvars` to version control as it contains sensitive data.

### 3. Initialize Terraform

```bash
terraform init
```

This downloads the required providers (AWS).

### 4. Plan the Deployment

```bash
terraform plan
```

Review the resources that will be created:
- VPC and networking components
- Security group with appropriate rules
- EC2 instance with user data script
- Elastic IP

### 5. Apply the Configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm the deployment.

The deployment takes approximately 5-10 minutes:
- EC2 instance provisioning: ~2 minutes
- Docker installation: ~2 minutes
- Container deployment: ~3-5 minutes

### 6. Access the Outputs

After successful deployment:

```bash
terraform output
```

Example output:
```
public_ip = "3.28.105.22"
ssh_command = "ssh -i ~/.ssh/najah-delivery-key.pem ubuntu@3.28.105.22"
merchant_portal_url = "http://3.28.105.22"
api_url = "http://3.28.105.22:8080"
admin_url = "http://3.28.105.22:8501"
```

## Accessing the Deployed Application

### Web Interfaces

- **Merchant Portal**: http://YOUR_PUBLIC_IP
- **Express API**: http://YOUR_PUBLIC_IP:8080
- **Streamlit Admin**: http://YOUR_PUBLIC_IP:8501
- **Driver App**: http://YOUR_PUBLIC_IP:3001

### SSH Access

```bash
ssh -i ~/.ssh/najah-delivery-key.pem ubuntu@YOUR_PUBLIC_IP
```

Once connected, you can:

```bash
# View running containers
cd /opt/najah-delivery
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update services
docker-compose pull
docker-compose up -d
```

## Monitoring and Troubleshooting

### Check Instance Status

```bash
# Check if instance is running
aws ec2 describe-instances \
  --instance-ids $(terraform output -raw instance_id) \
  --region me-south-1

# View system logs
aws ec2 get-console-output \
  --instance-id $(terraform output -raw instance_id) \
  --region me-south-1
```

### Check Docker Services

```bash
# SSH into instance
ssh -i ~/.ssh/najah-delivery-key.pem ubuntu@$(terraform output -raw public_ip)

# Check Docker containers
docker ps

# View specific service logs
docker logs najah-express-api
docker logs najah-mongo

# Check resource usage
docker stats
```

### Common Issues

**Issue**: Cannot connect to instance
- **Solution**: Check security group rules, verify SSH key permissions (400)

**Issue**: Services not starting
- **Solution**: Check Docker logs, verify .env configuration, ensure sufficient memory

**Issue**: MongoDB connection errors
- **Solution**: Wait for MongoDB to fully initialize (~30 seconds), check logs

## Updating the Deployment

### Update Infrastructure

```bash
# Modify variables or configuration
vim terraform.tfvars

# Apply changes
terraform apply
```

### Update Application Code

```bash
# SSH into instance
ssh -i ~/.ssh/najah-delivery-key.pem ubuntu@$(terraform output -raw public_ip)

# Pull latest images
cd /opt/najah-delivery
docker-compose pull

# Restart with new images
docker-compose up -d
```

## Cost Estimation

Approximate monthly costs (me-south-1 region):
- **t3.medium EC2**: ~$30-35/month
- **EBS Storage (30GB)**: ~$3/month
- **Elastic IP**: $0 (while attached)
- **Data Transfer**: Varies by usage

**Total**: ~$35-40/month

## Scaling Considerations

For production workloads:

1. **Increase instance size**: t3.large or t3.xlarge
2. **Add RDS for MongoDB**: Managed database service
3. **Add load balancer**: ELB for high availability
4. **Use Auto Scaling**: For dynamic scaling
5. **Add CloudWatch**: For monitoring and alerts
6. **Enable backups**: EBS snapshots or RDS backups

## Security Best Practices

1. **Restrict SSH access**: Update security group to allow only your IP
2. **Use SSL/TLS**: Add HTTPS with Let's Encrypt
3. **Rotate credentials**: Regular key and password rotation
4. **Enable CloudTrail**: Audit logging
5. **Use IAM roles**: Instead of access keys
6. **Regular updates**: Keep OS and packages updated

## Destroying the Infrastructure

When you're done testing or want to tear down:

```bash
terraform destroy
```

Type `yes` to confirm deletion of all resources.

**Warning**: This will permanently delete:
- EC2 instance and all data
- Elastic IP
- VPC and networking components
- Any data stored in containers

## Backup and Recovery

### Manual Backup

```bash
# SSH into instance
ssh -i ~/.ssh/najah-delivery-key.pem ubuntu@$(terraform output -raw public_ip)

# Backup MongoDB data
docker exec najah-mongo mongodump --out /data/backup

# Copy backup locally
docker cp najah-mongo:/data/backup ./mongo-backup
```

### Automated Backups

Consider setting up:
- EBS snapshots via AWS Backup
- MongoDB backups to S3
- Application data backups

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review AWS CloudWatch logs
3. Check application documentation
4. Open an issue on GitHub

## License

[Your License Here]
