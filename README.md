# Projeto: Desligamento Automático de Carregamento USB

## Objetivo

Criar um sistema que monitora o carregamento de um dispositivo conectado via USB e, quando detectar que a bateria está carregada (ou praticamente carregada), interrompe a alimentação automaticamente para evitar carga desnecessária.

---

# Componentes Necessários

## 1. ESP32

### Função
É o cérebro do sistema.

Responsável por:

- Ler os dados do INA219;
- Calcular corrente, tensão e potência;
- Decidir quando desligar a saída USB;
- Acionar o MOSFET.

### Quantidade

1 unidade

---

## 2. INA219

### Função

Monitorar o consumo do dispositivo conectado.

### Mede

- Tensão (V);
- Corrente (A);
- Potência (W).

### Exemplo

Início da carga:

- 5V
- 1,2A
- 6W

Fim da carga:

- 5V
- 0,05A
- 0,25W

### Quantidade

1 unidade

---

## 3. MOSFET IRLZ44N

### Função

Atuar como chave eletrônica.

Ele liga ou corta a alimentação USB quando o ESP32 enviar o comando.

### Quantidade

1 unidade

---

## 4. Protoboard

### Função

Permitir a montagem sem solda.

Vantagens:

- Facilita testes;
- Permite alterações rápidas;
- Evita soldagem na fase inicial.

### Quantidade

1 unidade

---

## 5. Jumpers Macho-Macho

### Função

Realizar as conexões entre os componentes.

### Quantidade

20 a 30 unidades

---

## 6. Cabo USB para o ESP32

### Função

- Alimentar o ESP32;
- Programar o ESP32 pelo notebook.

### Quantidade

1 unidade

---

## 7. Cabo USB do Dispositivo

Pode ser:

- USB-C;
- Micro USB;
- Lightning.

Dependendo do equipamento que será carregado.

### Quantidade

1 unidade

---

# Alimentação

Como o projeto será conectado ao notebook:

Notebook
↓
USB
↓
ESP32

Não é necessária uma fonte externa para alimentar o ESP32.

---

# Funcionamento do Sistema

## Etapa 1

O notebook alimenta o ESP32 através da porta USB.

Notebook
↓
ESP32

---

## Etapa 2

O dispositivo é conectado à porta USB monitorada.

Dispositivo
↓
INA219

O INA219 mede continuamente:

- Tensão;
- Corrente;
- Potência.

---

## Etapa 3

O ESP32 lê os dados do INA219.

Exemplo:

- 5,02V
- 1,15A
- 5,77W

---

## Etapa 4

Enquanto a corrente estiver acima do limite configurado:

Corrente > 100mA

O sistema entende que o dispositivo ainda está carregando.

---

## Etapa 5

Quando a corrente cair abaixo do limite:

Corrente < 100mA

Durante um período contínuo (exemplo: 5 minutos), o sistema considera a carga concluída.

---

## Etapa 6

O ESP32 envia um sinal para o MOSFET.

ESP32
↓
MOSFET

---

## Etapa 7

O MOSFET interrompe a alimentação.

Antes:

Notebook
↓
Dispositivo

Depois:

Notebook
X
Dispositivo

---

# Fluxograma da Lógica

Início
↓
Ler INA219
↓
Corrente > 100mA?
↓
Sim → Continuar monitorando
↓
Não
↓
Esperar 5 minutos
↓
Corrente continua baixa?
↓
Sim
↓
Desligar MOSFET
↓
Fim

---

# Ligações Básicas

ESP32 ↔ INA219

| INA219 | ESP32 |
|---------|---------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO 21 |
| SCL | GPIO 22 |

ESP32 ↔ MOSFET

| MOSFET | ESP32 |
|---------|---------|
| Gate | GPIO 18 |
| Source | GND |
| Drain | Linha negativa da carga |

---

# Melhorias Futuras

- Monitoramento via Wi-Fi;
- Dashboard no ThingsBoard;
- Aplicativo para celular;
- Histórico de carregamentos;
- Múltiplas portas USB independentes;
- Estatísticas de consumo de energia.

---

# Custo Estimado

| Componente | Faixa de Preço |
|------------|---------------|
| ESP32 | R$ 30 a R$ 50 |
| INA219 | R$ 10 a R$ 20 |
| IRLZ44N | R$ 5 a R$ 15 |
| Protoboard | R$ 15 a R$ 25 |
| Kit Jumpers | R$ 10 a R$ 20 |

## Total Estimado

Entre R$ 70 e R$ 130.

---

# Observação Importante

Uma porta USB de notebook normalmente fornece entre 500 mA e 900 mA.

Para testes iniciais, isso é suficiente para pequenos dispositivos USB.

Caso o objetivo seja carregar celulares modernos com correntes acima de 1A, será recomendada futuramente uma fonte USB dedicada, mantendo o notebook apenas para programar e monitorar o ESP32.
