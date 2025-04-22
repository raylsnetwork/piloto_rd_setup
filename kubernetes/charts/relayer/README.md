# Rays Relayer

![Version: v2.3.1](https://img.shields.io/badge/Version-v2.3.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: v2.3.1](https://img.shields.io/badge/AppVersion-v2.3.1-informational?style=flat-square)

A Helm chart for Kubernetes

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` | Affinity rules for scheduling pods. |
| atomic.envFrom | list | `[]` |  |
| atomic.envFromSecret | list | `[]` |  |
| atomic.image.pullPolicy | string | `"IfNotPresent"` | Pull policy for the atomic service Docker image. |
| atomic.image.repository | string | `"public.ecr.aws/rayls/rayls-atomic-service"` | Repository of the atomic service Docker image. |
| atomic.image.tag | string | `"v2.3.1"` | Tag of the atomic service Docker image. |
| atomic.podAnnotations | object | `{}` |  |
| atomic.podSecurityContext | object | `{}` |  |
| atomic.resources.enabled | bool | `true` |  |
| atomic.resources.limits.cpu | int | `1` |  |
| atomic.resources.limits.memory | string | `"2Gi"` |  |
| atomic.resources.requests.cpu | float | `0.5` |  |
| atomic.resources.requests.memory | string | `"1Gi"` |  |
| atomic.securityContext | object | `{}` |  |
| circomApi.EnvFrom | list | `[]` |  |
| circomApi.enabled | bool | `false` | Enable or disable the Circom API. |
| circomApi.image.pullPolicy | string | `"IfNotPresent"` | Pull policy for the Circom API Docker image. |
| circomApi.image.repository | string | `"public.ecr.aws/rayls/rayls-circom-api"` | Repository of the Circom API Docker image. |
| circomApi.image.tag | string | `"v2.3.1"` | Tag of the Circom API Docker image. |
| circomApi.replicas | int | `1` |  |
| circomApi.resources.enabled | bool | `true` |  |
| circomApi.resources.limits.cpu | int | `1` |  |
| circomApi.resources.limits.memory | string | `"2Gi"` |  |
| circomApi.resources.requests.cpu | float | `0.5` |  |
| circomApi.resources.requests.memory | string | `"1Gi"` |  |
| circomApi.service.port | int | `3000` | Port of the Circom API service. |
| circomApi.service.type | string | `"ClusterIP"` | Type of the Circom API service. |
| fullnameOverride | string | `""` | Override the full name of the chart. |
| global.domain | string | `"api.domain-example.com"` | Domain for the project. |
| global.project.name | string | `"rayls"` | Name of the project. |
| imagePullSecrets | list | `[]` | Secrets for pulling images from private registries. |
| kmm.EnvFrom | list | `[]` |  |
| kmm.image.pullPolicy | string | `"IfNotPresent"` | Pull policy for the KMM Docker image. |
| kmm.image.repository | string | `"public.ecr.aws/rayls/rayls-kmm"` | Repository of the KMM Docker image. |
| kmm.image.tag | string | `"v2.3.1"` | Tag of the KMM Docker image. |
| kmm.replicas | int | `1` |  |
| kmm.resources.limits.cpu | int | `1` |  |
| kmm.resources.limits.memory | string | `"2Gi"` |  |
| kmm.resources.requests.cpu | float | `0.5` |  |
| kmm.resources.requests.memory | string | `"1Gi"` |  |
| kmm.service.port | int | `8080` | Port of the KMM service. |
| kmm.service.type | string | `"ClusterIP"` | Type of the KMM service. |
| nameOverride | string | `""` | Override the name of the chart. |
| nodeSelector | object | `{}` | Node selector for scheduling pods. |
| relayer.enabled | bool | `true` | Enable or disable the relayer. |
| relayer.env.BLOCKCHAIN_CHAINID | int | `123456789` |  |
| relayer.env.BLOCKCHAIN_CHAINURL | string | `"http://rayls-core-team-dev-pl0.api.domain-example.com"` |  |
| relayer.env.BLOCKCHAIN_DATABASE_CONNECTION_STRING | string | `""` |  |
| relayer.env.BLOCKCHAIN_DATABASE_TYPE | string | `"mongodb"` |  |
| relayer.env.BLOCKCHAIN_ENYGMA_PL_EVENTS | string | `"0x0000000000000000000000000000000000000000"` |  |
| relayer.env.BLOCKCHAIN_ENYGMA_PROOF_API_ADDRESS | string | `"http://circomapi-pl0.api.domain-example.com"` |  |
| relayer.env.BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES | string | `"500"` |  |
| relayer.env.BLOCKCHAIN_KMS_API_KEY | string | `""` |  |
| relayer.env.BLOCKCHAIN_KMS_OPERATION_SERVICE_ROOT_URL | string | `"http://kmm-pl0.api.domain-example.com"` |  |
| relayer.env.BLOCKCHAIN_KMS_SECRET | string | `""` |  |
| relayer.env.BLOCKCHAIN_LISTENER_BATCH_BLOCKS | string | `"50"` |  |
| relayer.env.BLOCKCHAIN_PLENDPOINTADDRESS | string | `"0x0000000000000000000000000000000000000000"` |  |
| relayer.env.BLOCKCHAIN_PLSTARTINGBLOCK | string | `"0"` |  |
| relayer.env.BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES | string | `"200"` |  |
| relayer.env.COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK | string | `"999999999"` |  |
| relayer.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY | string | `"0x0000000000000000000000000000000000000000"` |  |
| relayer.env.COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES | string | `"500"` |  |
| relayer.env.COMMITCHAIN_CCSTARTINGBLOCK | string | `"9999999999"` |  |
| relayer.env.COMMITCHAIN_CHAINID | string | `"987654321"` |  |
| relayer.env.COMMITCHAIN_CHAINURL | string | `"http://commitchain.example.com:8545"` |  |
| relayer.env.COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES | string | `"30"` |  |
| relayer.env.COMMITCHAIN_OPERATORCHAINID | string | `"999"` |  |
| relayer.env.COMMITCHAIN_VERSION | string | `"2.0"` |  |
| relayer.env.KMS_API_KEY | string | `""` |  |
| relayer.env.KMS_AWSALIAS | string | `"xxx"` |  |
| relayer.env.KMS_AWSPROFILE | string | `"xxx"` |  |
| relayer.env.KMS_CORSDOMAIN | string | `"*"` |  |
| relayer.env.KMS_DATABASE_CONNECTIONSTRING | string | `""` |  |
| relayer.env.KMS_ENCRYPTORSERVICE | string | `"plaintext"` |  |
| relayer.env.KMS_GCPCRYPTOKEY | string | `"xxx"` |  |
| relayer.env.KMS_GCPKEYRING | string | `"xxx"` |  |
| relayer.env.KMS_GCPLOCATION | string | `"xxx"` |  |
| relayer.env.KMS_GCPPROJECT | string | `"xxx"` |  |
| relayer.env.KMS_SECRET | string | `""` |  |
| relayer.env.LOG_HANDLER | string | `"Text"` |  |
| relayer.env.LOG_LEVEL | string | `"Info"` |  |
| relayer.envFrom | list | `[]` |  |
| relayer.envFromSecret | list | `[]` |  |
| relayer.image.pullPolicy | string | `"IfNotPresent"` | Pull policy for the relayer Docker image. |
| relayer.image.repository | string | `"public.ecr.aws/rayls/rayls-relayer"` | Repository of the relayer Docker image. |
| relayer.image.tag | string | `"v2.3.1"` | Tag of the relayer Docker image. |
| relayer.podAnnotations | object | `{}` |  |
| relayer.podSecurityContext | object | `{}` |  |
| relayer.resources.enabled | bool | `true` |  |
| relayer.resources.limits.cpu | int | `1` |  |
| relayer.resources.limits.memory | string | `"2Gi"` |  |
| relayer.resources.requests.cpu | float | `0.5` |  |
| relayer.resources.requests.memory | string | `"1Gi"` |  |
| relayer.securityContext | object | `{}` |  |
| serviceAccount.annotations | object | `{}` | Annotations for the service account. |
| serviceAccount.create | bool | `true` | Create a service account. |
| serviceAccount.name | string | `""` | Name of the service account. |
| tolerations | list | `[]` | Tolerations for scheduling pods. |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
