#!/bin/bash

set -e

IMAGE=formit/ssl
AWS_ACCOUNT=590744054339
AWS_REGION=us-east-1
REGISTERED=registered.json
BRANCH_TARGETS=("development")

should_deploy_branch() {
  for i in "${BRANCH_TARGETS[@]}"; do
    if [[ "$1" == "$i" ]]; then
      return 0
    fi
  done

  return 1
}

build() {
  # Get the tag from argument to this function
  TAG="${1:-latest}"

  echo "Building Docker image: '$IMAGE' with tag: '$TAG'..."

  docker build -t $IMAGE:$TAG .
}

register() {
  echo "Registering ECS task definition..."

  if [ "$TRAVIS_BRANCH" == "master" ]; then
    aws ecs register-task-definition --cli-input-json file://task-definition.json > $REGISTERED
  else
    aws ecs register-task-definition --cli-input-json file://task-definition-$TRAVIS_BRANCH.json > $REGISTERED
  fi

  REVISION=$(cat $REGISTERED | grep "\"revision\"\:" | grep -o -E '[0-9]+')

  echo "Registered ECS Task Revision #${REVISION}"

  ./slack-notify.sh ok "Registered ECS Task Revision #${REVISION}"  
}

push() {
  # Get the tag from argument to this function
  TAG="${1:-latest}"

  echo "Deploying Docker image: '$IMAGE:$TAG'"

  ./slack-notify.sh "Deploying Docker image: '$IMAGE:$TAG'"

  build $TAG

  echo "Logging into ECR..."

  `aws ecr get-login`

  echo "Tagging & pushing: '$IMAGE:$TAG'..."

  docker tag $IMAGE:$TAG $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE:$TAG
  docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE:$TAG
  
  register
}

# Don't deploy PRs
if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then

  # Deploy tag
  if [ ! -z "$TRAVIS_TAG" ]; then
    push $TRAVIS_TAG

  # Deploy master branch as production tag
  elif [ "$TRAVIS_BRANCH" == "master" ]; then
    push latest
  
  # Deploy a targeted branch
  elif should_deploy_branch $TRAVIS_BRANCH; then
    push $TRAVIS_BRANCH
  fi
fi