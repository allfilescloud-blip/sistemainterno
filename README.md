# Sistema de Atendimentos

Sistema de gerenciamento de chamados com integração ao Firebase e API Ideris.

## Configuração

### 1. Configurar Secrets no GitHub

Para que a aplicação funcione corretamente, você precisa configurar os seguintes secrets no repositório do GitHub:

1. Vá para **Settings** > **Secrets and variables** > **Actions**
2. Adicione os seguintes secrets:

| Secret Name | Valor |
|-------------|-------|
| `FIREBASE_API_KEY` | Sua API Key do Firebase |
| `FIREBASE_AUTH_DOMAIN` | Seu Auth Domain do Firebase |
| `FIREBASE_PROJECT_ID` | Seu Project ID do Firebase |
| `FIREBASE_STORAGE_BUCKET` | Seu Storage Bucket do Firebase |
| `FIREBASE_MESSAGING_SENDER_ID` | Seu Messaging Sender ID do Firebase |
| `FIREBASE_APP_ID` | Seu App ID do Firebase |
| `FIREBASE_MEASUREMENT_ID` | Seu Measurement ID do Firebase |
| `IDERIS_PRIVATE_KEY` | Sua Private Key da API Ideris |

### 2. Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative os serviços:
   - **Authentication** (com provedor Email/Senha)
   - **Firestore Database**
   - **Storage**
3. Obtenha as credenciais do projeto em **Project settings** > **General** > **Your apps**

### 3. Estrutura de Dados do Firestore

A aplicação espera as seguintes coleções no Firestore:

- `chamados`: Para armazenar os chamados
- `usuarios`: Para armazenar informações dos usuários

### 4. Deploy Automático

O deploy para o GitHub Pages é automático através do GitHub Actions. Toda vez que você fizer push para a branch `main`, o workflow será executado.

## Desenvolvimento Local

Para desenvolvimento local, você pode substituir manualmente os valores no arquivo `scripts/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "sua-api-key-aqui",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-ABCDEF1234"
};