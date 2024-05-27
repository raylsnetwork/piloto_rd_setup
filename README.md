# Setup Rayls

Neste guia, você obterá uma visão geral dos resultados e recursos ao configurar e implantar o operador VEN da Rayls e o participante da Network por meio do uso do Docker e Kubernetes.

## [Setup VEN Operator](./ven-operator/README.md)

### Setup Docker

1. [Realizar a implantação dos contratos na Commit Chain](./ven-operator/README.md#realizando-o-deploy-dos-contratos-na-commit-chain)
2. [Adição de novos Participantes](./ven-operator/README.md#adicionando-novos-participantes)

> ℹ️ É essencial que este passo seja realizado antes do [Setup do participante](#setup-participante)  

### Setup Kubernetes

1. [Criação da base de dados para os Rayls Components](./ven-operator/README.md#criação-da-base-de-dados-para-os-rayls-componentes)
2. [Geração das chaves criptográficas](./ven-operator/README.md#gerando-as-chaves-para-os-rayls-components)
3. [Definição do namespace no Kubernetes](./ven-operator/README.md#namespace)
4. [Implantação dos Rayls Components - API, Flagger e Listener](./ven-operator/README.md#rayls-components)
5. [Instalando a Rayls Privacy Ledger](./ven-operator/README.md/#privacy-ledger)
6. [Instalando a Rayls Relayer](./ven-operator/README.md/#relayer)

## [Setup Participante](./participant/README.md)

### Setup Docker

1. [MongoDB](./participant/README.md#mongodb)
2. [Instalação a Rayls utilizando Docker Compose](./participant/README.md#instalação-utilizando-docker-compose)

### Setup Kubernetes

1. [Definição do namespace no Kubernetes](./participant/README.md#namespace)
2. [Adicionando credenciais no cluster Kubernetes](./participant/README.md#adicionando-as-credenciais-no-cluster-kubernetes)
3. [Instalando a Rayls Privacy Ledger](./participant/README.md#privacy-ledger)
4. [Instalando o Rayls Relayer](./participant/README.md#executando-o-relayer)
