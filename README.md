[![Travis Build Status](https://img.shields.io/travis/cmr1/docker-sslr.svg?style=flat-square)](https://travis-ci.org/cmr1/docker-sslr)
[![DockerHub pulls](https://img.shields.io/docker/pulls/cmr1/sslr.svg?style=flat-square)](https://hub.docker.com/r/cmr1/sslr)
[![DockerHub stars](https://img.shields.io/docker/stars/cmr1/sslr.svg?style=flat-square)](https://hub.docker.com/r/cmr1/sslr)

# docker-sslr
SSL Generator task defined in Docker


### Example Environments

**Generate SSL Cert and import to AWS ACM:**
```bash
APP_ENV=production # or 'staging'
DOMAINS=example.com,www.example.com
CHALLENGETYPE=http-01 # or 'dns-01'
KEYSIZE=2048 # Currently, ACM will not import a keysize above 2048!
CONTACT_EMAIL=webmaster@example.com
OUTPUT_ACM=yes
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=AK*****************
AWS_SECRET_ACCESS_KEY=*********************************
```
