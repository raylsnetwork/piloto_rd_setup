# Rayls Privacy Ledger

![Version: v2.3.1](https://img.shields.io/badge/Version-v2.3.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: v2.3.1](https://img.shields.io/badge/AppVersion-v2.3.1-informational?style=flat-square)

A Helm chart for Kubernetes

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| fullnameOverride | string | `""` | Override the full name of the chart. |
| global.project.name | string | `"rayls"` | Name of the project. |
| imagePullSecrets | list | `[]` | Secrets for pulling images from private registries. |
| nameOverride | string | `""` | Override the name of the chart. |
| nodeSelector | object | `{}` |  |
| privacyLedger.enabled | bool | `true` | Enable or disable the Privacy Ledger. |
| privacyLedger.env.GAS_LIMIT | string | `"45000000"` | Gas limit for the Privacy Ledger. |
| privacyLedger.env.MONGODB_CONN | string | `"mongodb://<release-name>.<namespace>.svc.cluster.local:27017/admin?directConnection=true&replicaSet=rs0"` | MongoDB connection string for the Privacy Ledger. |
| privacyLedger.env.NETWORKID | int | `600001` | Network ID for the Privacy Ledger. |
| privacyLedger.env.PERIOD | int | `1` | Block period for the Privacy Ledger. |
| privacyLedger.envFrom | list | `[]` |  |
| privacyLedger.envFromSecret | list | `[]` |  |
| privacyLedger.httpPort | int | `8545` | HTTP port for the Privacy Ledger. |
| privacyLedger.image.pullPolicy | string | `"IfNotPresent"` | Pull policy for the Privacy Ledger Docker image. |
| privacyLedger.image.repository | string | `"public.ecr.aws/rayls/rayls-privacy-ledger"` | Repository of the Privacy Ledger Docker image. |
| privacyLedger.image.tag | string | `"v2.3.1"` | Tag of the Privacy Ledger Docker image. |
| privacyLedger.livenessProbe.enabled | bool | `true` | Enable or disable the liveness probe. |
| privacyLedger.livenessProbe.params.initialDelaySeconds | int | `30` | Initial delay for the liveness probe. |
| privacyLedger.livenessProbe.params.periodSeconds | int | `15` | Period for the liveness probe. |
| privacyLedger.livenessProbe.path | string | `"/"` | Path for the liveness probe. |
| privacyLedger.metricsPort | int | `6080` | Metrics port for the Privacy Ledger. |
| privacyLedger.persistence.ebs.persistentVolumeReclaimPolicy | string | `"Retain"` | Reclaim policy for EBS persistence. |
| privacyLedger.persistence.ebs.storage | string | `"5Gi"` | Storage size for EBS persistence. |
| privacyLedger.persistence.ebs.storageClassName | string | `"gp2"` | Storage class name for EBS persistence. |
| privacyLedger.persistence.efs.csi.driver | string | `"efs.csi.aws.com"` | CSI driver for EFS persistence. |
| privacyLedger.persistence.efs.csi.volumeHandle | string | `"fs-00a0a0a0a0"` | Volume handle for EFS persistence. |
| privacyLedger.persistence.efs.persistentVolumeReclaimPolicy | string | `"Retain"` | Reclaim policy for EFS persistence. |
| privacyLedger.persistence.efs.storage | string | `"5Gi"` | Storage size for EFS persistence. |
| privacyLedger.persistence.efs.storageClassName | string | `"efs-sc"` | Storage class name for EFS persistence. |
| privacyLedger.persistence.enabled | bool | `true` | Enable or disable persistence for the Privacy Ledger. |
| privacyLedger.persistence.hostPath.path | string | `"/mnt/data"` | Path for hostPath persistence. |
| privacyLedger.persistence.hostPath.persistentVolumeReclaimPolicy | string | `"Retain"` | Reclaim policy for hostPath persistence. |
| privacyLedger.persistence.hostPath.storage | string | `"5Gi"` | Storage size for hostPath persistence. |
| privacyLedger.persistence.type | string | `""` | Type of persistence for the Privacy Ledger. Options: "efs", "ebs", or "" (empty for hostPath). |
| privacyLedger.podAnnotations | object | `{}` |  |
| privacyLedger.podSecurityContext | object | `{}` |  |
| privacyLedger.readinessProbe.enabled | bool | `true` | Enable or disable the readiness probe. |
| privacyLedger.readinessProbe.params.initialDelaySeconds | int | `30` | Initial delay for the readiness probe. |
| privacyLedger.readinessProbe.params.periodSeconds | int | `15` | Period for the readiness probe. |
| privacyLedger.readinessProbe.path | string | `"/"` | Path for the readiness probe. |
| privacyLedger.resources.enabled | bool | `true` | Enable or disable resource requests and limits. |
| privacyLedger.resources.limits.cpu | int | `1` | CPU limit for the Privacy Ledger. |
| privacyLedger.resources.limits.memory | string | `"2Gi"` | Memory limit for the Privacy Ledger. |
| privacyLedger.resources.requests.cpu | float | `0.5` | CPU request for the Privacy Ledger. |
| privacyLedger.resources.requests.memory | string | `"1Gi"` | Memory request for the Privacy Ledger. |
| privacyLedger.securityContext | object | `{}` |  |
| privacyLedger.service.type | string | `"ClusterIP"` | Type of Kubernetes service for the Privacy Ledger. |
| privacyLedger.wsPort | int | `8660` | WebSocket port for the Privacy Ledger. |
| prometheus.enabled | bool | `true` | Enable or disable Prometheus monitoring. |
| serviceAccount.annotations | object | `{}` | Annotations for the service account. |
| serviceAccount.create | bool | `true` | Create a service account for the Privacy Ledger. |
| serviceAccount.name | string | `""` | Name of the service account. |
| tolerations | list | `[]` |  |

----------------------------------------------
Autogenerated from chart metadata using [helm-docs v1.11.0](https://github.com/norwoodj/helm-docs/releases/v1.11.0)
