
CLI Instructions to Create an AKS Stack with Linux and Windows Worker Nodes  
--  

Instructions - taken from
[here](https://docs.microsoft.com/en-us/azure/aks/windows-container-cli).  
--   

1) Login to use the CLI   

```
az login
```

2) Create a resource group  

```
az group create \
        --name RESOURCE_GROUP_NAME \
        --location REGION
```  

3) Create a Cluster  

```
az aks create \
        --resource-group RESOURCE_GROUP_NAME \
        --name CLUSTER_NAME \
        --node-count 2 \
        --enable-addons monitoring \
        --generate-ssh-keys \
        --windows-admin-username USERNAME \
        --vm-set-type VirtualMachineScaleSets \
        --kubernetes-version 1.24.0 \
        --network-plugin azure
```  

After running this provide a Windows Admin password to kick off the deployment.  

4) Install kubectl locally

sudo az aks install-cli

5) Get credentials  

```
 az aks get-credentials \
        --resource-group RESOURCE_GROUP_NAME \
        --name CLUSTER_NAME
```  

6)  Run the following kubectl command to test 

```
kubectl get nodes
```

```
NAME        STATUS   ROLES   AGE     VERSION OS-IMAGE  
aks-xxx-0   Ready    agent   24m     v1.20.7 Ubuntu 18.04.6 LTS  
aks-xxx-1   Ready    agent   23m     v1.20.7 Ubuntu 18.04.6 LTS  
```

7) Create secrets for agent using keys from
[here](https://app.datadoghq.com/organization-settings/users).  

```
sudo kubectl create secret generic datadog-agent \
        --from-literal api-key=<key> \
        --from-literal app-key=<key>
```  

8) Install Linux Datadog agent from
[here](https://docs.datadoghq.com/agent/kubernetes/?tab=helm)  

In values.yaml set the following:  

```
clusterName:  CLUSTER_NAME    
tlsVerify: false  
portEnabled: true #under apm  
```

```
sudo helm repo add datadog https://helm.datadoghq.com  
sudo helm repo update  
sudo helm install dd-agent -f values.yaml datadog/datadog  
```  

