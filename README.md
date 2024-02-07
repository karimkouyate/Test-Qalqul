# Test Chat Application Back

Design and develop a real-time chat API using Node.js, integrating with RabbitMQ, Kafka, Redis, and WebSockets. The system aims to be robust, scalable, and efficient in handling various chat interactions.

# Installation and Usage of Kafka on Windows

## Prerequisites
- [Download Kafka for Windows](https://kafka.apache.org/downloads) (Scala 2.13)
- Extract the downloaded files
- Rename the extracted folder to "kafka" and place it in the C:\ directory

## Configuration
1. Navigate to the `kafka\config` directory
2. Modify the `server.properties` file:
   - `log.dirs` : `c:/kafka/kafka-log`
   - `zookeeper.properties` : `dataDir=c:/kafka/zookeeper-data`

## Launching Kafka
Open different command prompts and execute the following commands:

1. In the `C:/kafka` directory, start Zookeeper:
   ```bash
   .\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties
    ```
2. In the same C:/kafka directory, start the Kafka server:
  ```bash
.\bin\windows\kafka-server-start.bat .\config\server.properties
  ```
3. Create topics for the chat:
  ```bash
  .\bin\windows\kafka-topics.bat --create --bootstrap-server localhost:9092 --topic chat-messages
  .\bin\windows\kafka-topics.bat --create --bootstrap-server localhost:9092 --topic chat-events
  ```

## Usage

In another command prompt, to produce messages:
 ```bash
.\bin\windows\kafka-console-producer.bat --broker-list localhost:9092 --topic chat-messages
  ```
  You can manually type text or send JSON messages ({"text": "hello", "roomId":"17", "sender":2}).

To consume messages:
 ```bash
.\bin\windows\kafka-console-consumer.bat --topic chat-messages --bootstrap-server localhost:9092 --from-beginning
  ```

## Stopping zookeeper and Kafka
 ```bash
 .\bin\windows\zookeeper-server-stop.bat .\config\zookeeper.properties
 .\bin\windows\kafka-server-stop.bat .\config\server.properties
  ```

## Redis

- Install Redis for windows msi version [here](https://github.com/tporadowski/redis/releases)

- Launch redis server on cmd : redis-server


## Installation Guide

### Requirements
- [Nodejs](https://nodejs.org/en/download)
- [MongodbCompass](https://www.mongodb.com/try/download/compass)
or use MongodbAtlas

Both should be installed and make sure mongodb is running.

```shell
git clone https://github.com/karimkouyate/Test-Qalqul
```

Now install the dependencies
```shell
cd Test-Qalqul
yarn or npm install
```
We are almost done, Now just start the development server.

Open another terminal in folder, Also make sure mongodb is running in background.
```shell
cd server
yarn start or npm start
```

